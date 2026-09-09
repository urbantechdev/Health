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
  chimeType?: string;
  repeatCount: number;
  defaultRoom?: string;
  announceOnNewTicket?: boolean;
  announceOnTurnArrived?: boolean;
}

const DEFAULT_CONFIG: VoiceAnnouncementConfig = {
  enabled: true,
  volume: 1.0,
  rate: 0.95,
  pitch: 1.05,
  chimeEnabled: true,
  chimeType: "chime-bell",
  repeatCount: 1,
  defaultRoom: "Room 1 - Consultation",
  announceOnNewTicket: true,
  announceOnTurnArrived: true
};

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
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
      } catch {
        // ignore
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
        this.audioCtx.resume();
      }
    } catch (err) {
      console.warn("[VoiceAnnouncer] resumeAudioContext failed:", err);
    }
  }

  public playChime(_chimeType?: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.chimeEnabled) {
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
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = "sine";
        // Two-tone chime: C5 (523.25) to G5 (783.99)
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25 * this.config.volume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.65);
        setTimeout(resolve, 600);
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

  public selectBestCalmFemaleVoice(availableVoices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const voices = availableVoices && availableVoices.length > 0 ? availableVoices : this.getVoices();
    if (voices.length === 0) return null;

    // Prefer calm natural female English voices
    const match = voices.find(
      (v) =>
        (v.name.includes("Female") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Zira") ||
          v.name.includes("Karen") ||
          v.name.includes("Moira")) &&
        v.lang.startsWith("en")
    );
    if (match) return match;

    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  }

  public stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.notify(null);
  }

  public async announceTurnArrived(params: VoiceAnnouncementParams): Promise<void> {
    if (!this.config.enabled) return;

    const spokenTicket = (params.ticketNo || "").replace(/-/g, " ");
    const text = `Ticket number ${spokenTicket}. ${params.patientName}, please proceed to ${params.roomOrDesk}`;

    const activeItem: ActiveAnnouncement = {
      id: `ann-${Date.now()}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: params.roomOrDesk,
      departmentOrRole: params.departmentOrRole,
      formattedText: text,
      text,
      timestamp: new Date().toISOString()
    };

    this.notify(activeItem);
    await this.playChime(this.config.chimeType);
    await this.speak(text, params.repeatCount || this.config.repeatCount || 1);
  }

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
      pName = ticketOrParams.patientName || "Patient";
      room = ticketOrParams.roomOrDesk || ticketOrParams.department || "Consultation";
    } else {
      tNo = ticketOrParams;
      pName = patientName || "Patient";
      room = deptOrDesk || "Consultation";
    }

    const spokenTicket = (tNo || "").replace(/-/g, " ");
    const text = `New ticket ${spokenTicket} logged for ${pName}. Assigned to ${room}.`;

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
      const pName = ticketOrParams.patientName || "Patient";
      const room = ticketOrParams.assignedRoom || ticketOrParams.department || "Reception";
      return this.announceTicketLogged(tNo, pName, room);
    } else {
      return this.announceTicketLogged(
        ticketOrParams,
        patientName || "Patient",
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

    const activeItem: ActiveAnnouncement = {
      id: `ann-${Date.now()}`,
      formattedText: text,
      text,
      roomOrDesk: extraRoom || roomOrDeskOrTitle || "General Announcement",
      timestamp: new Date().toISOString()
    };

    this.notify(activeItem);
    await this.playChime(this.config.chimeType);
    await this.speak(text, 1);
  }

  private speak(text: string, repetitions = 1): Promise<void> {
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

        currentRepetition++;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.volume = this.config.volume;

        const voices = this.getVoices();
        const preferredURI = this.config.preferredVoiceURI || this.config.voiceURI;
        if (preferredURI) {
          const selected = voices.find((v) => v.voiceURI === preferredURI);
          if (selected) utterance.voice = selected;
        }
        if (!utterance.voice) {
          const best = this.selectBestCalmFemaleVoice();
          if (best) utterance.voice = best;
        }

        utterance.onend = () => {
          if (currentRepetition < repetitions) {
            setTimeout(playNext, 1200);
          } else {
            this.notify(null);
            resolve();
          }
        };

        utterance.onerror = () => {
          this.notify(null);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      };

      playNext();
    });
  }
}

export const voiceAnnouncer = new VoiceAnnouncementService();
