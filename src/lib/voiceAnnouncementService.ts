export interface VoiceAnnouncementParams {
  ticketNo: string;
  patientName: string;
  roomOrDesk: string;
  departmentOrRole?: string;
  repeatCount?: number;
}

export interface ActiveAnnouncement {
  id: string;
  ticketNo?: string;
  patientName?: string;
  roomOrDesk?: string;
  departmentOrRole?: string;
  formattedText: string;
  text?: string;
  timestamp: string;
}

export interface VoiceAnnouncementConfig {
  enabled: boolean;
  volume: number;
  rate: number;
  pitch: number;
  voiceURI?: string;
  preferredVoiceURI?: string;
  voiceGenderPreference?: string;
  chimeEnabled: boolean;
  chimeType?: "hospital_3tone" | "banking_ding_dong" | "subtle_bell" | "chime-bell" | "none" | string;
  repeatCount: number;
  defaultRoom?: string;
  announceOnNewTicket?: boolean;
  announceOnTurnArrived?: boolean;
}

const DEFAULT_CONFIG: VoiceAnnouncementConfig = {
  enabled: true,
  volume: 1.0,
  rate: 0.90, // Calm, measured cadence for clear hospital acoustics
  pitch: 1.0, // Grounded, warm, natural pitch
  chimeEnabled: true,
  chimeType: "hospital_3tone", // Soothing 3-tone harmonic hospital chord
  repeatCount: 1,
  defaultRoom: "Consultation Room 1",
  announceOnNewTicket: true,
  announceOnTurnArrived: true,
  voiceGenderPreference: "female"
};

/**
 * Text Polisher & Pronunciation Normalizer for Natural Fluent English
 */
export function formatTicketForSpeech(ticketNo: string): string {
  if (!ticketNo) return "";
  const trimmed = ticketNo.trim().toUpperCase();

  // If ticket has hyphenated parts like "OPD-104", "LAB-003", "BIL-201", "PHA-045"
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    const prefix = parts[0].trim();
    const rest = parts.slice(1).join(" ").trim();

    let prefixSpoken = prefix;
    if (prefix === "OPD") prefixSpoken = "O, P, D";
    else if (prefix === "TKT") prefixSpoken = "Ticket";
    else if (prefix === "LAB") prefixSpoken = "Laboratory";
    else if (prefix === "BIL") prefixSpoken = "Billing";
    else if (prefix === "PHA") prefixSpoken = "Pharmacy";
    else if (prefix === "TRI") prefixSpoken = "Triage";
    else {
      prefixSpoken = prefix.split("").join(" ");
    }

    // Space out digits for crisp PA enunciation
    const spacedDigits = rest.split("").join(" ");
    return `${prefixSpoken}, ${spacedDigits}`;
  }

  // If alphanumeric without hyphen like "52TC" or "A102"
  return trimmed.split("").join(" ");
}

export function formatPatientNameForSpeech(name?: string): string {
  if (!name) return "";
  const raw = name.trim();
  if (/^(patient|walk-?in|emergency|unknown|null|undefined)$/i.test(raw)) {
    return "";
  }

  // Remove bracketed or parenthesized tags like (Self), (OPD), [Walk-in], IDs
  let cleaned = raw
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\b(Mr\.|Mrs\.|Ms\.|Dr\.)\b/gi, "")
    .replace(/\b\d{5,}\b/g, "") // strip long national/patient ID numbers
    .trim();

  if (!cleaned) return "";

  // Convert ALL CAPS (which causes synthesis engines to spell out letters) to polite Title Case
  cleaned = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return cleaned;
}

export function formatRoomForSpeech(room?: string): string {
  if (!room) return "the consultation room";
  let clean = room.trim();

  // Strip trailing internal role suffixes like ", doctor" or " doctor"
  clean = clean.replace(/,\s*doctor$/i, "").replace(/\s+doctor$/i, "").trim();

  // Standardize common hospital locations into fluent spoken phrases
  if (/^rm\s*(\d+)/i.test(clean)) clean = clean.replace(/^rm\s*/i, "Room ");
  if (/^room\s*(\d+)$/i.test(clean)) clean = `Consultation ${clean}`;
  if (/^triage$/i.test(clean) || /^nurse\s*triage$/i.test(clean)) clean = "the Nurse Triage Station";
  if (/^doctor$/i.test(clean) || /^consultation$/i.test(clean)) clean = "the Doctor's Consultation Room";
  if (/^pharmacy$/i.test(clean)) clean = "the Main Pharmacy Counter";
  if (/^laboratory$/i.test(clean) || /^lab$/i.test(clean)) clean = "the Clinical Laboratory";
  if (/^billing$/i.test(clean) || /^cashier$/i.test(clean)) clean = "the Central Billing Desk";
  if (/^radiology$/i.test(clean) || /^x-?ray$/i.test(clean)) clean = "the Radiology and X-Ray Unit";
  if (/^reception$/i.test(clean)) clean = "the Main Reception Desk";
  if (/^admissions?$/i.test(clean)) clean = "the Admission Office";

  return clean;
}

class VoiceAnnouncementService {
  private audioCtx: AudioContext | null = null;
  private listeners: Set<(announcement: ActiveAnnouncement | null) => void> = new Set();
  private currentAnnouncement: ActiveAnnouncement | null = null;
  private config: VoiceAnnouncementConfig = { ...DEFAULT_CONFIG };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hmis_voice_announcer_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config = {
            ...DEFAULT_CONFIG,
            ...parsed,
            // Gracefully modernize previous settings to calm fluent acoustics
            rate: parsed.rate && parsed.rate >= 0.8 && parsed.rate <= 1.05 ? parsed.rate : DEFAULT_CONFIG.rate,
            pitch: parsed.pitch && parsed.pitch >= 0.95 && parsed.pitch <= 1.1 ? parsed.pitch : DEFAULT_CONFIG.pitch,
            chimeType: parsed.chimeType && parsed.chimeType !== "chime-bell" ? parsed.chimeType : DEFAULT_CONFIG.chimeType,
          };
        }
      } catch {
        // ignore
      }

      // Automatically listen for browser speech synthesis voices being populated asynchronously
      if ("speechSynthesis" in window) {
        const initVoices = () => {
          if (!this.config.preferredVoiceURI) {
            const best = this.selectBestCalmVoice();
            if (best) {
              this.config.preferredVoiceURI = best.voiceURI;
            }
          }
        };

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = initVoices;
        }
        setTimeout(initVoices, 150);
      }
    }
  }

  public getConfig(): VoiceAnnouncementConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<VoiceAnnouncementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hmis_voice_announcer_config", JSON.stringify(this.config));
      } catch {
        // ignore
      }
    }
  }

  public subscribe(listener: (announcement: ActiveAnnouncement | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentAnnouncement);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(announcement: ActiveAnnouncement | null): void {
    this.currentAnnouncement = announcement;
    this.listeners.forEach((l) => {
      try {
        l(announcement);
      } catch {
        // ignore
      }
    });
  }

  public resumeAudioContext(): void {
    try {
      if (!this.audioCtx && typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch (err) {
      console.warn("[VoiceAnnouncer] resumeAudioContext failed:", err);
    }
  }

  /**
   * Soothing Multi-Tone Acoustic Chimes for Healthcare Environments
   */
  public playChime(chimeType?: string): Promise<void> {
    const selectedChime = chimeType || this.config.chimeType || "hospital_3tone";

    return new Promise((resolve) => {
      if (!this.config.chimeEnabled || selectedChime === "none") {
        resolve();
        return;
      }

      try {
        this.resumeAudioContext();
        if (!this.audioCtx) {
          resolve();
          return;
        }

        const now = this.audioCtx.currentTime;
        const volumeFactor = Math.max(0.1, Math.min(1.0, this.config.volume));

        if (selectedChime === "hospital_3tone") {
          // Soothing Hospital 3-Tone Harmonic Triad: F4 (349.23 Hz) -> A4 (440.00 Hz) -> C5 (523.25 Hz)
          const notes = [
            { freq: 349.23, time: now, dur: 0.35 },
            { freq: 440.0, time: now + 0.18, dur: 0.35 },
            { freq: 523.25, time: now + 0.36, dur: 0.65 }
          ];

          notes.forEach(({ freq, time, dur }) => {
            const osc = this.audioCtx!.createOscillator();
            const gain = this.audioCtx!.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.22 * volumeFactor, time + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

            osc.connect(gain);
            gain.connect(this.audioCtx!.destination);

            osc.start(time);
            osc.stop(time + dur);
          });

          setTimeout(resolve, 950);
        } else if (selectedChime === "banking_ding_dong") {
          // Warm 2-Tone Airport/Banking Chime: D5 (587.33 Hz) -> A4 (440.00 Hz)
          const notes = [
            { freq: 587.33, time: now, dur: 0.4 },
            { freq: 440.0, time: now + 0.22, dur: 0.6 }
          ];

          notes.forEach(({ freq, time, dur }) => {
            const osc = this.audioCtx!.createOscillator();
            const gain = this.audioCtx!.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.24 * volumeFactor, time + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

            osc.connect(gain);
            gain.connect(this.audioCtx!.destination);

            osc.start(time);
            osc.stop(time + dur);
          });

          setTimeout(resolve, 800);
        } else if (selectedChime === "subtle_bell") {
          // Crystal Subtle Bell (880 Hz with soft overtone)
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(880.0, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.2 * volumeFactor, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.75);

          setTimeout(resolve, 750);
        } else {
          // Standard chime-bell: C5 to G5
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(783.99, now + 0.16);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.22 * volumeFactor, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.65);

          setTimeout(resolve, 650);
        }
      } catch {
        resolve();
      }
    });
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }

  /**
   * Evaluates and scores an installed synthesizer voice to rank for calm, fluent, articulate English.
   */
  public scoreVoice(voice: SpeechSynthesisVoice): number {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase().replace(/_/g, "-");

    // Only English voices
    if (!lang.startsWith("en")) {
      return -100;
    }

    let score = 50;

    // Highest fidelity: Modern Neural / Natural online browser synthesisers
    if (name.includes("natural")) score += 100;
    if (name.includes("neural")) score += 100;
    if (name.includes("online")) score += 40;
    if (name.includes("premium") || name.includes("enhanced")) score += 60;

    // Accent preference: British English is globally recognized for courteous, reassuring hospital announcements
    if (lang === "en-gb") score += 40;
    else if (lang === "en-us") score += 30;
    else if (lang === "en-au" || lang === "en-ca" || lang === "en-ie") score += 25;

    // Renowned calm, articulate voices
    if (name.includes("google uk english female")) score += 95;
    if (name.includes("google us english")) score += 75;
    if (name.includes("microsoft aria online (natural)")) score += 95;
    if (name.includes("microsoft jenny online (natural)")) score += 95;
    if (name.includes("microsoft sonia online (natural)")) score += 95;
    if (name.includes("microsoft libby online (natural)")) score += 90;
    if (name.includes("microsoft natasha online (natural)")) score += 85;
    if (name.includes("samantha")) score += 70;
    if (name.includes("serena")) score += 75;
    if (name.includes("karen")) score += 70;
    if (name.includes("moira")) score += 65;
    if (name.includes("hazel")) score += 65;
    if (name.includes("zira")) score += 55;
    if (name.includes("victoria")) score += 55;

    // Calm male voices as solid secondary options
    if (name.includes("google uk english male")) score += 50;
    if (name.includes("microsoft ryan online (natural)")) score += 70;
    if (name.includes("george") || name.includes("daniel") || name.includes("oliver")) score += 45;

    // Penalize known robotic, low-bitrate, or telephony voices
    if (name.includes("espeak") || name.includes("klatt")) score -= 120;
    if (name.includes("compact")) score -= 35;
    if (name.includes("whisper")) score -= 50;
    if (name.includes("desktop")) score -= 15;

    return score;
  }

  /**
   * Returns available English voices ranked from calmest & most natural to standard.
   */
  public getSortedEnglishVoices(availableVoices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
    const voices = availableVoices && availableVoices.length > 0 ? availableVoices : this.getVoices();
    return voices
      .filter((v) => v.lang.toLowerCase().startsWith("en"))
      .sort((a, b) => this.scoreVoice(b) - this.scoreVoice(a));
  }

  /**
   * Intelligently selects the best calm, fluent, articulate voice available on the host system.
   */
  public selectBestCalmVoice(availableVoices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const sorted = this.getSortedEnglishVoices(availableVoices);
    if (sorted.length > 0) {
      return sorted[0];
    }
    const anyVoices = availableVoices && availableVoices.length > 0 ? availableVoices : this.getVoices();
    return anyVoices.find((v) => v.lang.startsWith("en")) || anyVoices[0] || null;
  }

  /**
   * Backward-compatible alias for existing components
   */
  public selectBestCalmFemaleVoice(availableVoices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    return this.selectBestCalmVoice(availableVoices);
  }

  public stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.notify(null);
  }

  /**
   * Broadcasts a patient's turn arrival with polite, calm, fluent English prosody.
   */
  public async announceTurnArrived(params: VoiceAnnouncementParams): Promise<void> {
    if (!this.config.enabled) return;

    const spokenTicket = formatTicketForSpeech(params.ticketNo);
    const spokenPatient = formatPatientNameForSpeech(params.patientName);
    const spokenRoom = formatRoomForSpeech(params.roomOrDesk);

    // Natural conversational cadence and polite pauses
    const firstCall = spokenPatient
      ? `Attention please. Ticket number ${spokenTicket}, ${spokenPatient}. Please proceed to ${spokenRoom}.`
      : `Attention please. Ticket number ${spokenTicket}. Please proceed to ${spokenRoom}.`;

    const repeatCall = spokenPatient
      ? `Repeating call. Ticket number ${spokenTicket}, ${spokenPatient}. Please proceed to ${spokenRoom}, thank you.`
      : `Repeating call. Ticket number ${spokenTicket}. Please proceed to ${spokenRoom}, thank you.`;

    const activeItem: ActiveAnnouncement = {
      id: `ann-${Date.now()}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: params.roomOrDesk,
      departmentOrRole: params.departmentOrRole,
      formattedText: firstCall,
      text: firstCall,
      timestamp: new Date().toISOString()
    };

    this.notify(activeItem);
    await this.playChime(this.config.chimeType);
    await this.speakWithVariations([firstCall, repeatCall], params.repeatCount || this.config.repeatCount || 1);
  }

  /**
   * Broadcasts a newly logged patient ticket with clear, polite hospital terminology.
   */
  public async announceTicketLogged(
    ticketOrParams:
      | string
      | {
          ticketNo: string;
          patientName?: string;
          department?: string;
          service?: string;
          status?: string;
          roomOrDesk?: string;
        },
    patientName?: string,
    deptOrDesk?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    let tNo = "";
    let pName = "";
    let room = "";

    if (typeof ticketOrParams === "object") {
      tNo = ticketOrParams.ticketNo;
      pName = ticketOrParams.patientName || "";
      room = ticketOrParams.roomOrDesk || ticketOrParams.department || "Consultation";
    } else {
      tNo = ticketOrParams;
      pName = patientName || "";
      room = deptOrDesk || "Consultation";
    }

    const spokenTicket = formatTicketForSpeech(tNo);
    const spokenPatient = formatPatientNameForSpeech(pName);
    const spokenRoom = formatRoomForSpeech(room);

    const text = spokenPatient
      ? `Ticket number ${spokenTicket}, has been issued for ${spokenPatient}. Please proceed to ${spokenRoom}.`
      : `Ticket number ${spokenTicket}, has been registered. Please proceed to ${spokenRoom}.`;

    const activeItem: ActiveAnnouncement = {
      id: `ann-${Date.now()}`,
      ticketNo: tNo,
      patientName: pName,
      roomOrDesk: room,
      formattedText: text,
      text,
      timestamp: new Date().toISOString()
    };

    this.notify(activeItem);
    await this.playChime(this.config.chimeType);
    await this.speak(text, 1);
  }

  public async announceNewTicket(
    ticketOrParams:
      | string
      | {
          ticketNo: string;
          patientName?: string;
          department?: string;
          assignedRoom?: string;
        },
    patientName?: string,
    deptOrDesk?: string
  ): Promise<void> {
    if (typeof ticketOrParams === "object") {
      const tNo = ticketOrParams.ticketNo;
      const pName = ticketOrParams.patientName || "";
      const room = ticketOrParams.assignedRoom || ticketOrParams.department || "Reception";
      return this.announceTicketLogged(tNo, pName, room);
    } else {
      return this.announceTicketLogged(
        ticketOrParams,
        patientName || "",
        deptOrDesk || "Reception"
      );
    }
  }

  public async announceCustom(
    text: string,
    roomOrDeskOrTitle?: string,
    extraRoom?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Ensure polite speech opening if not already present
    let spokenText = text.trim();
    if (!/^attention/i.test(spokenText) && !/^repeating/i.test(spokenText)) {
      spokenText = `Attention please. ${spokenText}`;
    }

    const activeItem: ActiveAnnouncement = {
      id: `ann-${Date.now()}`,
      formattedText: spokenText,
      text: spokenText,
      roomOrDesk: extraRoom || roomOrDeskOrTitle || "Hospital Public Address",
      timestamp: new Date().toISOString()
    };

    this.notify(activeItem);
    await this.playChime(this.config.chimeType);
    await this.speak(spokenText, 1);
  }

  private speak(text: string, repetitions = 1): Promise<void> {
    return this.speakWithVariations([text], repetitions);
  }

  private speakWithVariations(phrases: string[], repetitions = 1): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setTimeout(() => {
          this.notify(null);
          resolve();
        }, 3000);
        return;
      }

      window.speechSynthesis.cancel();
      let currentRepetition = 0;

      const playNext = () => {
        if (currentRepetition >= repetitions) {
          this.notify(null);
          resolve();
          return;
        }

        const textToSpeak = phrases[Math.min(currentRepetition, phrases.length - 1)];
        currentRepetition++;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.volume = Math.max(0.1, Math.min(1.0, this.config.volume));

        const voices = this.getVoices();
        const preferredURI = this.config.preferredVoiceURI || this.config.voiceURI;

        if (preferredURI) {
          const selected = voices.find((v) => v.voiceURI === preferredURI);
          if (selected) utterance.voice = selected;
        }

        if (!utterance.voice) {
          const best = this.selectBestCalmVoice(voices);
          if (best) utterance.voice = best;
        }

        utterance.onend = () => {
          if (currentRepetition < repetitions) {
            // Calm, polite 1.4-second inter-phrase breathing gap
            setTimeout(playNext, 1400);
          } else {
            this.notify(null);
            resolve();
          }
        };

        utterance.onerror = () => {
          this.notify(null);
          resolve();
        };

        // Resume engine in case browser paused it
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      };

      playNext();
    });
  }
}

export const voiceAnnouncer = new VoiceAnnouncementService();
