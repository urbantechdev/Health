export interface DoctorWorkload {
  doctorId: string;
  doctorName: string;
  specialty: string;
  department?: string;
  roomNumber: string;
  activeQueueCount: number;
  completedTodayCount: number;
  isOnline: boolean;
  status?: string;
  totalLoad?: number;
  doctor?: any;
  [key: string]: any;
}

export interface SpecialtyQueueBalance {
  specialty: string;
  recommendedDoctor: DoctorWorkload | null;
  recommendedRoom: string;
  allEligibleDoctors: DoctorWorkload[];
  matchingDoctors: DoctorWorkload[];
  totalSpecialtyWaiting: number;
  recommendationReason?: string;
  [key: string]: any;
}

export function normalizeSpecialtyTerm(term?: string): string {
  if (!term) return "general";
  let s = term.toLowerCase().trim();
  if (s === "cardiologist" || s === "cardiology") return "cardiology";
  if (s.includes("pediatr")) return "pediatrics";
  if (s.includes("gyn") || s.includes("obs")) return "obgyn";
  if (s.includes("ortho")) return "orthopedics";
  if (s.includes("dent")) return "dental";
  if (s.includes("opt") || s.includes("ophth")) return "ophthalmology";
  if (s.includes("ent")) return "ent";
  if (s.includes("surg")) return "surgery";
  if (s.endsWith("ist")) return s.slice(0, -3) + "y";
  if (s.endsWith("ician")) return s.slice(0, -5) + "y";
  return s;
}

const DOCTOR_ROOM_MAP: Record<string, string> = {
  "default": "Room 101 - General OPD",
  "pediatrics": "Room 104 - Paediatrics Clinic",
  "obgyn": "Room 106 - Obs / Gynae & Antenatal",
  "cardiology": "Room 108 - Cardiology Suite",
  "orthopedics": "Room 110 - Orthopaedic Clinic",
  "dental": "Room 112 - Dental Unit",
  "ophthalmology": "Room 114 - Eye Clinic",
  "ent": "Room 115 - ENT Suite",
};

export function getDoctorConsultationRoom(doctorOrNameOrId?: any): string {
  if (!doctorOrNameOrId) return "Room 101 - General OPD";
  if (typeof doctorOrNameOrId === "object") {
    if (doctorOrNameOrId.roomNumber) return doctorOrNameOrId.roomNumber;
    if (doctorOrNameOrId.room) return doctorOrNameOrId.room;
    if (doctorOrNameOrId.consultationRoom) return doctorOrNameOrId.consultationRoom;
    const spec = normalizeSpecialtyTerm(doctorOrNameOrId.specialty);
    return DOCTOR_ROOM_MAP[spec] || "Room 102 - OPD Consultation";
  }
  const str = String(doctorOrNameOrId);
  return DOCTOR_ROOM_MAP[normalizeSpecialtyTerm(str)] || "Room 101 - General OPD";
}

export function calculateAllDoctorsWorkload(doctors: any[] = [], queue: any[] = []): DoctorWorkload[] {
  return doctors.map((doc, idx) => {
    const docId = String(doc.id || doc.doctorId || `doc-${idx}`);
    const docName = doc.name || doc.doctorName || "Doctor";
    const specialty = doc.specialty || "General Medicine";
    const waiting = queue.filter(
      (q) =>
        (q.assignedDoctorId === docId || q.doctorName === docName || q.assignedDoctor === docName) &&
        (q.status === "waiting" || q.status === "in_consultation" || q.status === "called")
    ).length;
    const completed = queue.filter(
      (q) =>
        (q.assignedDoctorId === docId || q.doctorName === docName || q.assignedDoctor === docName) &&
        (q.status === "completed" || q.status === "consulted")
    ).length;

    return {
      doctorId: docId,
      doctorName: docName,
      specialty,
      department: doc.department || "Outpatient",
      roomNumber: doc.room || doc.roomNumber || getDoctorConsultationRoom(doc),
      activeQueueCount: waiting,
      totalLoad: waiting,
      completedTodayCount: completed,
      isOnline: doc.status !== "inactive" && doc.status !== "offline",
      status: doc.status || "active",
      doctor: doc,
    };
  });
}

export function getSmartQueueRecommendation(params: {
  specialtyName?: string;
  department?: string;
  fallbackRoom?: string;
  employees?: any[];
  queueTickets?: any[];
  [key: string]: any;
}): SpecialtyQueueBalance {
  const normSpec = normalizeSpecialtyTerm(params.specialtyName);
  const rawDoctors = (params.employees || []).filter(
    (emp) =>
      emp.role === "Doctor" ||
      emp.role === "Specialist" ||
      (emp.department && emp.department.toLowerCase().includes("clinical"))
  );

  const workloads = calculateAllDoctorsWorkload(rawDoctors, params.queueTickets || []);

  const matching = workloads.filter((w) => {
    if (!params.specialtyName) return true;
    return normalizeSpecialtyTerm(w.specialty) === normSpec || normalizeSpecialtyTerm(w.department) === normSpec;
  });

  const pool = matching.length > 0 ? matching : workloads;

  // Pick least active queue count
  let recommended: DoctorWorkload | null = null;
  if (pool.length > 0) {
    const sorted = [...pool].sort((a, b) => a.activeQueueCount - b.activeQueueCount);
    recommended = sorted[0];
  }

  const room = recommended?.roomNumber || params.fallbackRoom || DOCTOR_ROOM_MAP[normSpec] || "Room 101 - General OPD";
  const totalWaiting = pool.reduce((acc, curr) => acc + curr.activeQueueCount, 0);

  return {
    specialty: params.specialtyName || "General OPD",
    recommendedDoctor: recommended,
    recommendedRoom: room,
    allEligibleDoctors: pool,
    matchingDoctors: pool,
    totalSpecialtyWaiting: totalWaiting,
    recommendationReason: recommended
      ? `Assigned via smart least-queue load balancing (${recommended.activeQueueCount} patients waiting)`
      : "Standard OPD Allocation",
  };
}
