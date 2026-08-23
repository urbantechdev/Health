// NextGen HMS - Intelligent Banking & Hospital Voice Queue Announcement Engine
// Provides high-fidelity acoustic chimes (Web Audio API) + Natural Speech Synthesis (Web Speech API)

export interface VoiceAnnouncementConfig {
  enabled: boolean;
  announceOnNewTicket: boolean;
  announceOnTurnArrived: boolean;
  repeatCount: 1 | 2;
  volume: number; // 0.1 to 1.0
  rate: number; // 0.8 to 1.2
  pitch: number; // 0.8 to 1.3
  chimeType: "banking_ding_dong" | "hospital_3tone" | "subtle_bell" | "none";
  preferredVoiceURI?: string;
  defaultRoom: string;
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

const STORAGE_KEY = "nextgen_hms_voice_announcer_config_v2";

const DEFAULT_CONFIG: VoiceAnnouncementConfig = {
  enabled: true,
  announceOnNewTicket: true,
  announceOnTurnArrived: true,
  repeatCount: 1,
  volume: 1.0,
  rate: 0.92,
  pitch: 1.04,
  chimeType: "banking_ding_dong",
  defaultRoom: "Room 5, Doctor"
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

  constructor() {
    this.config = this.loadConfig();
    this.initAudioContext();
  }

  private loadConfig(): VoiceAnnouncementConfig {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
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
   * Generates a rich, resonant multi-tone chime (Banking 2-tone Ding-Dong or Hospital 3-tone)
   */
  public async playChime(type = this.config.chimeType): Promise<void> {
    if (type === "none" || !this.config.enabled) return;

    this.initAudioContext();
    this.resumeAudioContext();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (type === "banking_ding_dong") {
      // Classic Airport / High-End Banking Ding-Dong (High tone ~587.33Hz D5 -> Drop ~440Hz A4)
      return new Promise((resolve) => {
        // Tone 1: High crisp chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.35 * this.config.volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        // Tone 2: Lower mellow resonant chime
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440.0, now + 0.35); // A4
        gain2.gain.setValueAtTime(0.4 * this.config.volume, now + 0.35);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.35);
        osc2.stop(now + 1.0);

        setTimeout(resolve, 850);
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
          gain.gain.setValueAtTime(0.3 * this.config.volume, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.5);
        });
        setTimeout(resolve, 1000);
      });
    } else if (type === "subtle_bell") {
      // Warm single bell
      return new Promise((resolve) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880.0, now);
        gain.gain.setValueAtTime(0.25 * this.config.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        setTimeout(resolve, 600);
      });
    }
  }

  /**
   * Helper to spell out ticket codes naturally for crystal-clear PA vocalization.
   * e.g., "52TC" => "5 2 T C"
   * e.g., "TCK-8492" => "T C K, 8 4 9 2"
   * e.g., "GEN-002" => "G E N, 0 0 2"
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

    // Split alphanumeric chunks
    return cleaned.split("").join(" ");
  }

  /**
   * Announce when a ticket's turn has arrived in the queue (Banking / Hospital Counter style)
   * Example: "Ticket number 5 2 T C, please go to Room 5, Doctor"
   */
  public async announceTurnArrived(params: {
    ticketNo: string;
    patientName?: string;
    roomOrDesk?: string;
    departmentOrRole?: string;
    repeatCount?: 1 | 2;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.announceOnTurnArrived) return;

    const room = (params.roomOrDesk || this.config.defaultRoom || "Room 5, Doctor").trim();
    const spokenTicket = this.formatTicketForSpeech(params.ticketNo);

    // Standard banking / hospital announcement template
    // "Ticket number 5 2 T C, please go to Room 5, Doctor"
    let spokenText = `Ticket number ${spokenTicket}, please go to ${room}`;
    if (params.departmentOrRole && !room.toLowerCase().includes(params.departmentOrRole.toLowerCase())) {
      spokenText += `, ${params.departmentOrRole}`;
    }

    const item: ActiveAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNo: params.ticketNo,
      patientName: params.patientName,
      roomOrDesk: room,
      departmentOrRole: params.departmentOrRole || "Doctor",
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
   * Example: "New ticket raised: Ticket number 5 2 T C. Please proceed to Waiting Area for Room 5"
   */
  public async announceNewTicket(params: {
    ticketNo: string;
    patientName?: string;
    department?: string;
    assignedRoom?: string;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.announceOnNewTicket) return;

    const spokenTicket = this.formatTicketForSpeech(params.ticketNo);
    const dept = params.department || "General Consultation";
    const room = params.assignedRoom || "Waiting Area";

    let spokenText = `New ticket raised. Ticket number ${spokenTicket}. `;
    if (params.patientName) {
      spokenText += `Patient ${params.patientName}. `;
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
      // 1. Play Chime first
      await this.playChime(this.config.chimeType);

      // 2. Speak Text
      await this.speakUtterance(current.announcement.formattedText);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    } finally {
      // Small pause after speech finishes
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

  private speakUtterance(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.log(`[SPEECH FALLBACK] ${text}`);
        return resolve();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = Math.max(0.1, Math.min(1.0, this.config.volume));
      utterance.rate = Math.max(0.7, Math.min(1.3, this.config.rate));
      utterance.pitch = Math.max(0.7, Math.min(1.4, this.config.pitch));

      // Choose preferred voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (this.config.preferredVoiceURI) {
          const selected = voices.find((v) => v.voiceURI === this.config.preferredVoiceURI);
          if (selected) utterance.voice = selected;
        } else {
          // Prefer natural clear English voices (e.g. Google UK English Female, Samantha, or Natural)
          const preferred = voices.find(
            (v) =>
              (v.lang.startsWith("en") || v.lang.startsWith("sw")) &&
              (v.name.includes("Natural") ||
                v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Victoria") ||
                v.name.includes("Karen") ||
                v.name.includes("Daniel"))
          );
          if (preferred) utterance.voice = preferred;
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
      }, 12000);

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Get available browser speech voices
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices();
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
