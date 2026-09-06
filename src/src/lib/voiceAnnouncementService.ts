// NextGen HMS - Intelligent Banking & Hospital Voice Queue Announcement Engine
// Provides high-fidelity acoustic chimes (Web Audio API) + Natural Speech Synthesis (Web Speech API)
// Optimized for Loud, Calm Female Voice & Fluent English Announcing

export interface VoiceAnnouncementConfig {
  enabled: boolean;
  announceOnNewTicket: boolean;
  announceOnTurnArrived: boolean;
  repeatCount: 1 | 2;
  volume: number; // 0.1 to 1.0 (Default 1.0 for loud/clear PA)
  rate: number; // 0.75 to 1.25 (Default 0.90 for calm, articulate cadence)
  pitch: number; // 0.8 to 1.3 (Default 1.02 for natural warm feminine tone)
  chimeType: "banking_ding_dong" | "hospital_3tone" | "subtle_bell" | "none";
  preferredVoiceURI?: string;
  defaultRoom: string;
  voiceGenderPreference?: "female" | "any";
}

export interface ActiveAnnouncement {
  id: string;
  ticketNo: string;
  patientName?: string;
  roomOrDesk: string;
  departmentOrRole: string;
  announcementType: "turn_arrived" | "new_ticket" | "recall" | "custom";
  formattedText: string;
  timestamp: number;
}

const STORAGE_KEY = "nextgen_hms_voice_announcer_config_v3";

const DEFAULT_CONFIG: VoiceAnnouncementConfig = {
  enabled: true,
  announceOnNewTicket: true,
  announceOnTurnArrived: true,
  repeatCount: 1,
  volume: 1.0, // Maximum loudness
  rate: 0.90, // Calm, fluent, articulate hospital cadence
  pitch: 1.02, // Warm, pleasant, calm female pitch
  chimeType: "banking_ding_dong",
  defaultRoom: "Room 5",
  voiceGenderPreference: "female"
};

type Listener = (active: ActiveAnnouncement | null) => void;

class VoiceAnnouncementService {
  private config: VoiceAnnouncementConfig;
  private audioCtx: AudioContext | null = null;
  private isSpeaking: boolean = false;
  private queue: Array<{
    announcement: ActiveAnnouncement;
    resolve: () => void;
  }> = [];
  private currentAnnouncement: ActiveAnnouncement | null = null;
  private listeners: Set<Listener> = new Set();
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.initAudioContext();
    this.initVoiceListener();
  }

  private initVoiceListener() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const refreshVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.cachedVoices = voices;
        }
      } catch (e) {
        console.warn("Could not retrieve speechSynthesis voices:", e);
      }
    };

    refreshVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  private loadConfig(): VoiceAnnouncementConfig {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.defaultRoom) {
          parsed.defaultRoom = parsed.defaultRoom.replace(/,\s*doctor$/i, "").replace(/\s+doctor$/i, "").trim() || "Room 5";
        }
        return { ...DEFAULT_CONFIG, ...parsed, volume: parsed.volume ?? 1.0 };
      }
    } catch (e) {
      console.warn("Failed to load voice config from localStorage:", e);
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(newConfig: Partial<VoiceAnnouncementConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn("Failed to persist voice config:", e);
      }
    }
  }

  public getConfig(): VoiceAnnouncementConfig {
    return { ...this.config };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.currentAnnouncement);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentAnnouncement));
  }

  private initAudioContext() {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !this.audioCtx) {
      try {
        this.audioCtx = new AudioContextClass();
      } catch (e) {
        console.warn("Web Audio API not supported:", e);
      }
    }
  }

  public resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Generates a loud, resonant, crystal-clear multi-tone chime (Banking 2-tone Ding-Dong or Hospital 3-tone)
   */
  public async playChime(type = this.config.chimeType): Promise<void> {
    if (type === "none" || !this.config.enabled) return;

    this.initAudioContext();
    this.resumeAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const vol = Math.max(0.2, Math.min(1.0, this.config.volume));

    if (type === "banking_ding_dong") {
      // Classic Airport / High-End Banking Ding-Dong (High tone ~587.33Hz D5 -> Drop ~440Hz A4)
      return new Promise((resolve) => {
        // Tone 1: High crisp chime (Full punchy loudness)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.70 * vol, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        // Tone 2: Lower mellow resonant chime (Loud & rich)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440.0, now + 0.35); // A4
        gain2.gain.setValueAtTime(0.80 * vol, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.35);
        osc2.stop(now + 1.1);

        setTimeout(resolve, 900);
      });
    } else if (type === "hospital_3tone") {
      // Medical 3-Tone Ascending/Descending Chord (F4 -> A4 -> C5)
      return new Promise((resolve) => {
        const freqs = [349.23, 440.0, 523.25]; // F4, A4, C5
        freqs.forEach((freq, idx) => {
          const t = now + idx * 0.22;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.60 * vol, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.55);
        });
        setTimeout(resolve, 1050);
      });
    } else if (type === "subtle_bell") {
      // Warm single bell
      return new Promise((resolve) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880.0, now);
        gain.gain.setValueAtTime(0.65 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
        setTimeout(resolve, 650);
      });
    }
  }

  /**
   * Helper to spell out ticket codes naturally and fluently for crystal-clear PA vocalization.
   * e.g., "52TC" => "5 2 T C"
   * e.g., "TCK-8492" => "T C K, 8 4 9 2"
   * e.g., "TRI-104" => "T R I, 1 0 4"
   */
  public formatTicketForSpeech(rawTicketNo: string): string {
    if (!rawTicketNo) return "unknown ticket";
    const cleaned = rawTicketNo.trim().toUpperCase();
    
    if (cleaned.includes("-")) {
      const parts = cleaned.split("-");
      const prefix = parts[0].split("").join(" ");
      const num = parts.slice(1).join("").split("").join(" ");
      return `${prefix}, ${num}`;
    }

    // Split alphanumeric chunks with clean spacing
    return cleaned.split("").join(" ");
  }

  /**
   * Announce when a ticket's turn has arrived in the queue (Calm, Fluent Female English PA voice)
   * Example: "Ticket number T R I, 1 0 4. Please proceed to Nurse Triage Desk 1."
   * Example: "Ticket number 5 2 T C. Please proceed to Room 5."
   */
  public async announceTurnArrived(params: {
    ticketNo: string;
    patientName?: string;
    roomOrDesk?: string;
    departmentOrRole?: string;
    repeatCount?: 1 | 2;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.announceOnTurnArrived) return;

    // Resolve destination specified from ticket
    let rawRoom = (params.roomOrDesk || this.config.defaultRoom || "Room 5").trim();
    let cleanRoom = rawRoom
      .replace(/,\s*doctor$/i, "")
      .replace(/-\s*doctor$/i, "")
      .replace(/\s+doctor$/i, "")
      .trim();

    if (!cleanRoom) {
      if (params.departmentOrRole && !/^doctor$/i.test(params.departmentOrRole.trim())) {
        cleanRoom = params.departmentOrRole.trim();
      } else {
        cleanRoom = "Room 5";
      }
    }

    const spokenTicket = this.formatTicketForSpeech(params.ticketNo);

    // Fluent, calm English phrasing with natural cadence and punctuation pauses
    let spokenText = `Ticket number ${spokenTicket}.`;
    if (params.patientName && params.patientName.trim()) {
      spokenText += ` Patient ${params.patientName.trim()}.`;
    }
    spokenText += ` Please proceed to ${cleanRoom}.`;

    const item: ActiveAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: cleanRoom,
      departmentOrRole: params.departmentOrRole || "Consultation",
      announcementType: "turn_arrived",
      formattedText: spokenText,
      timestamp: Date.now()
    };

    const count = params.repeatCount || this.config.repeatCount || 1;
    for (let i = 0; i < count; i++) {
      await this.enqueue(item);
    }
  }

  /**
   * Announce when a new ticket is raised at Reception / Kiosk / Department
   * Example: "New ticket issued. Ticket number T R I, 1 0 4. Please proceed to Nurse Triage Desk 1 for clinical intake."
   */
  public async announceNewTicket(params: {
    ticketNo: string;
    patientName?: string;
    department?: string;
    assignedRoom?: string;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.announceOnNewTicket) return;

    const spokenTicket = this.formatTicketForSpeech(params.ticketNo);
    const dept = params.department || "Clinical Triage & Consultation";
    const room = params.assignedRoom || "Waiting Area";

    let spokenText = `New ticket issued. Ticket number ${spokenTicket}. `;
    if (params.patientName && params.patientName.trim()) {
      spokenText += `Patient ${params.patientName.trim()}. `;
    }
    spokenText += `Please proceed to ${room} for ${dept}.`;

    const item: ActiveAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: room,
      departmentOrRole: dept,
      announcementType: "new_ticket",
      formattedText: spokenText,
      timestamp: Date.now()
    };

    await this.enqueue(item);
  }

  /**
   * Announce any ticket logged on queue (whether consultation, triage, lab, pharma, radiology, etc.)
   * Example: "Ticket number T R I, 1 0 4, Patient John Doe, logged on Laboratory queue. Please wait to be called."
   */
  public async announceTicketLogged(params: {
    ticketNo: string;
    patientName?: string;
    department?: string;
    service?: string;
    status?: string;
    roomOrDesk?: string;
  }): Promise<void> {
    if (!this.config.enabled) return;

    const spokenTicket = this.formatTicketForSpeech(params.ticketNo);
    const rawDept = (params.department || params.service || "Doctor Consultation").toLowerCase();
    
    let deptName = "Doctor Consultation";
    if (rawDept.includes("labour")) deptName = "Maternity Labour Room";
    else if (rawDept.includes("gyna")) deptName = "Gynecology Clinic";
    else if (rawDept.includes("lab")) deptName = "Laboratory";
    else if (rawDept.includes("rad") || rawDept.includes("x-ray")) deptName = "Radiology & Imaging";
    else if (rawDept.includes("pharm")) deptName = "Pharmacy Dispensing";
    else if (rawDept.includes("triage")) deptName = "Nurse Triage Desk";
    else if (rawDept.includes("reception")) deptName = "Hospital Reception";
    else if (rawDept.includes("billing")) deptName = "Billing & Cashier";
    else if (params.service && params.service.trim()) deptName = params.service.trim();

    let spokenText = "";
    if (params.status === "serving") {
      let room = (params.roomOrDesk || "Consultation Room").trim();
      spokenText = `Ticket number ${spokenTicket}.`;
      if (params.patientName && params.patientName.trim()) {
        spokenText += ` Patient ${params.patientName.trim()}.`;
      }
      spokenText += ` Please proceed to ${room}.`;
    } else {
      spokenText = `Ticket number ${spokenTicket}.`;
      if (params.patientName && params.patientName.trim()) {
        spokenText += ` Patient ${params.patientName.trim()}.`;
      }
      spokenText += ` Logged on ${deptName} queue. Please wait to be called.`;
    }

    const item: ActiveAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: params.roomOrDesk || deptName,
      departmentOrRole: deptName,
      announcementType: params.status === "serving" ? "turn_arrived" : "new_ticket",
      formattedText: spokenText,
      timestamp: Date.now()
    };

    const count = this.config.repeatCount || 1;
    for (let i = 0; i < count; i++) {
      await this.enqueue(item);
    }
  }

  /**
   * Manual direct announcement / custom page call
   */
  public async announceCustom(text: string, ticketNo?: string, room?: string): Promise<void> {
    if (!this.config.enabled) return;

    const item: ActiveAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNo: ticketNo || "HMIS",
      roomOrDesk: room || "Hospital Reception",
      departmentOrRole: "Hospital Voice Broadcast",
      announcementType: "custom",
      formattedText: text,
      timestamp: Date.now()
    };

    await this.enqueue(item);
  }

  private enqueue(announcement: ActiveAnnouncement): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ announcement, resolve });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    this.isSpeaking = true;
    const current = this.queue.shift();
    if (!current) {
      this.isSpeaking = false;
      return;
    }

    this.currentAnnouncement = current.announcement;
    this.notify();

    try {
      // 1. Play loud, crisp Chime first
      await this.playChime(this.config.chimeType);

      // 2. Speak Text with Calm, Loud Female Voice & Fluent English
      await this.speakUtterance(current.announcement.formattedText);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    } finally {
      // Small graceful pause after speech finishes
      await new Promise((r) => setTimeout(r, 600));

      this.currentAnnouncement = null;
      this.notify();
      this.isSpeaking = false;
      current.resolve();

      // Process next item in queue
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Selects the highest quality calm, fluent female English voice available on the host OS
   */
  public selectBestCalmFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;

    // Filter English voices
    const englishVoices = voices.filter(
      (v) => v.lang && (v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().startsWith("en_"))
    );

    const candidates = englishVoices.length > 0 ? englishVoices : voices;

    // Female voice scoring table
    const getScore = (voice: SpeechSynthesisVoice): number => {
      let score = 0;
      const name = voice.name.toLowerCase();
      const uri = (voice.voiceURI || "").toLowerCase();
      const lang = (voice.lang || "").toLowerCase();

      // Language scoring: Prefer standard accents (US, UK, Australian, Canadian, Irish, etc.)
      if (lang.includes("gb") || lang.includes("uk")) score += 35;
      else if (lang.includes("us")) score += 30;
      else if (lang.includes("au") || lang.includes("ca") || lang.includes("ie")) score += 25;
      else if (lang.startsWith("en")) score += 20;

      // Premium neural / natural online voices (Exceptionally calm and human-like)
      if (name.includes("natural") || uri.includes("natural")) score += 60;
      if (name.includes("neural") || uri.includes("neural")) score += 50;
      if (name.includes("online") || uri.includes("online")) score += 40;
      if (name.includes("enhanced") || uri.includes("enhanced")) score += 35;
      if (name.includes("google") || uri.includes("google")) score += 30;

      // Recognized calm, fluent female voice personas
      const topCalmFemaleNames = [
        "jenny", "aria", "sonia", "libby", "natasha", "ava", "emma", "ana",
        "samantha", "victoria", "karen", "serena", "moira", "fiona", "tessa",
        "zira", "hazel", "susan", "catherine", "linda", "heather", "clara",
        "amy", "olivia", "grace", "alice", "stephanie", "kate", "allison"
      ];

      for (const fn of topCalmFemaleNames) {
        if (name.includes(fn) || uri.includes(fn)) {
          score += 70;
          break;
        }
      }

      // Explicit female keyword check
      if (name.includes("female") || uri.includes("female")) {
        score += 50;
      }

      // Explicitly penalize male voices to ensure a calm female voice is chosen
      const maleNames = [
        "david", "mark", "george", "daniel", "guy", "ryan", "fred", "bruce",
        "male", "stefan", "oliver", "arthur", "james", "thomas", "alex", "paul"
      ];
      for (const mn of maleNames) {
        if (name.includes(mn) || uri.includes(mn)) {
          score -= 100;
          break;
        }
      }

      return score;
    };

    const sorted = [...candidates].sort((a, b) => getScore(b) - getScore(a));
    return sorted[0] || null;
  }

  private speakUtterance(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.log(`[SPEECH FALLBACK] ${text}`);
        return resolve();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // Ensure loud, crisp volume output (0.1 to 1.0)
      utterance.volume = Math.max(0.1, Math.min(1.0, this.config.volume));
      // Calm, articulate speech speed (0.85 to 0.95 is optimal for hospital queues)
      utterance.rate = Math.max(0.75, Math.min(1.25, this.config.rate));
      // Natural warm feminine pitch
      utterance.pitch = Math.max(0.8, Math.min(1.3, this.config.pitch));

      // Choose preferred voice if available
      const voices = window.speechSynthesis.getVoices().length > 0
        ? window.speechSynthesis.getVoices()
        : this.cachedVoices;

      if (voices.length > 0) {
        if (this.config.preferredVoiceURI) {
          const selected = voices.find((v) => v.voiceURI === this.config.preferredVoiceURI);
          if (selected) {
            utterance.voice = selected;
          } else {
            const bestFemale = this.selectBestCalmFemaleVoice(voices);
            if (bestFemale) utterance.voice = bestFemale;
          }
        } else {
          const bestFemale = this.selectBestCalmFemaleVoice(voices);
          if (bestFemale) utterance.voice = bestFemale;
        }
      }

      let timeoutHandle: any = null;

      utterance.onend = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn("Utterance error:", e);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve();
      };

      // Safety timeout: in case speech synthesis hangs on mobile or browser background
      timeoutHandle = setTimeout(() => {
        window.speechSynthesis.cancel();
        resolve();
      }, 14000);

      // Ensure speech synthesis is not stalled or paused on idle monitor screens
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Get available browser speech voices
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    const direct = window.speechSynthesis.getVoices();
    if (direct && direct.length > 0) return direct;
    return this.cachedVoices;
  }

  /**
   * Stop current speech & clear announcement queue
   */
  public stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.queue = [];
    this.isSpeaking = false;
    this.currentAnnouncement = null;
    this.notify();
  }
}

export const voiceAnnouncer = new VoiceAnnouncementService();

