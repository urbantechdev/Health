export interface SpecialistCategory {
  id: string;
  title: string;
}

export interface SpecialistDefinition {
  id: string;
  name: string;
  shortCode: string;
  title: string;
  category: string;
  department: string;
  defaultRoom: string;
  room?: string;
  description: string;
  focusAreas?: string;
  cadre?: string;
}

export const SPECIALIST_CATEGORIES: SpecialistCategory[] = [
  { id: "medicine", title: "General Medicine" },
  { id: "surgery", title: "Surgery" },
  { id: "obgyn", title: "Obstetrics & Gynaecology" },
  { id: "paediatrics", title: "Pediatrics & Child Health" },
  { id: "ortho", title: "Orthopaedics & Trauma" },
  { id: "cardio", title: "Cardiology" },
  { id: "eye", title: "Ophthalmology (Eye)" },
  { id: "dental", title: "Dental Services" },
  { id: "mental", title: "Psychiatry & Mental Health" },
  { id: "ent", title: "ENT (Ear, Nose & Throat)" }
];

export const HOSPITAL_SPECIALISTS_DIRECTORY: SpecialistDefinition[] = [
  {
    id: "spec-gen-med",
    name: "General Physician",
    shortCode: "MED",
    title: "Consultant Physician",
    category: "medicine",
    department: "doctor",
    defaultRoom: "Room 101 - Outpatient Clinical Suite",
    room: "Room 101 - Outpatient Clinical Suite",
    description: "General adult medical outpatient consultation, hypertension, diabetes, routine diagnosis.",
    focusAreas: "Internal medicine, infectious diseases, adult health"
  },
  {
    id: "spec-obgyn",
    name: "Obstetrician & Gynaecologist",
    shortCode: "OBG",
    title: "Senior Consultant Ob/Gyn",
    category: "obgyn",
    department: "doctor",
    defaultRoom: "Room 104 - Maternity & Women's Health Clinic",
    room: "Room 104 - Maternity & Women's Health Clinic",
    description: "Antenatal clinic, maternal care, ultrasound scans, high-risk pregnancies, reproductive health.",
    focusAreas: "Maternity, ultrasound, antenatal, prenatal"
  },
  {
    id: "spec-peds",
    name: "Paediatrician",
    shortCode: "PED",
    title: "Consultant Paediatrician",
    category: "paediatrics",
    department: "doctor",
    defaultRoom: "Room 102 - Child Wellness & Paediatric Clinic",
    room: "Room 102 - Child Wellness & Paediatric Clinic",
    description: "Infant and child wellness, routine immunizations, neonatal care, acute childhood infections.",
    focusAreas: "Child health, immunizations, neonatal"
  },
  {
    id: "spec-surg",
    name: "General Surgeon",
    shortCode: "SUR",
    title: "Consultant General Surgeon",
    category: "surgery",
    department: "doctor",
    defaultRoom: "Room 105 - Surgical Outpatient & Minor Theatre",
    room: "Room 105 - Surgical Outpatient & Minor Theatre",
    description: "Pre-operative workups, minor surgical procedures, wound care, elective surgery evaluations.",
    focusAreas: "Surgery, wounds, biopsies, lumps"
  },
  {
    id: "spec-ortho",
    name: "Orthopaedic Surgeon",
    shortCode: "ORT",
    title: "Consultant Orthopaedic Specialist",
    category: "ortho",
    department: "doctor",
    defaultRoom: "Room 106 - Orthopaedics & Plaster Suite",
    room: "Room 106 - Orthopaedics & Plaster Suite",
    description: "Fracture reduction, musculoskeletal trauma, joint arthritis, casting, sports injuries.",
    focusAreas: "Fractures, joints, bone trauma, plaster casting"
  },
  {
    id: "spec-cardio",
    name: "Cardiologist",
    shortCode: "CAR",
    title: "Consultant Cardiologist",
    category: "cardio",
    department: "doctor",
    defaultRoom: "Room 107 - Cardiac Diagnostic Clinic",
    room: "Room 107 - Cardiac Diagnostic Clinic",
    description: "Electrocardiograms (ECG), refractory hypertension, arrhythmia, heart failure management.",
    focusAreas: "ECG, heart diseases, chest pain"
  },
  {
    id: "spec-eye",
    name: "Ophthalmologist",
    shortCode: "OPH",
    title: "Consultant Eye Specialist",
    category: "eye",
    department: "doctor",
    defaultRoom: "Room 108 - Ophthalmology & Optometry Clinic",
    room: "Room 108 - Ophthalmology & Optometry Clinic",
    description: "Visual acuity tests, cataract assessments, ocular infections, glaucoma screening, refraction.",
    focusAreas: "Vision, eye drops, cataracts, glasses"
  },
  {
    id: "spec-dental",
    name: "Dental Surgeon",
    shortCode: "DEN",
    title: "Senior Dental Surgeon",
    category: "dental",
    department: "doctor",
    defaultRoom: "Room 109 - Dental Operatory Clinic",
    room: "Room 109 - Dental Operatory Clinic",
    description: "Tooth extraction, dental cleanings, oral surgery, dental fillings, root canal therapy.",
    focusAreas: "Teeth, oral health, extractions"
  },
  {
    id: "spec-ent",
    name: "ENT Specialist",
    shortCode: "ENT",
    title: "Consultant ENT Surgeon",
    category: "ent",
    department: "doctor",
    defaultRoom: "Room 110 - ENT Outpatient Suite",
    room: "Room 110 - ENT Outpatient Suite",
    description: "Otoscopy, audiometry, chronic sinusitis, tonsillitis, ear irrigation and foreign body removal.",
    focusAreas: "Ears, nose, throat, sinusitis"
  }
];

export function getSpecialistByName(name: string): SpecialistDefinition | undefined {
  if (!name) return undefined;
  return HOSPITAL_SPECIALISTS_DIRECTORY.find(
    (s) =>
      s.name.toLowerCase() === name.toLowerCase() ||
      s.title.toLowerCase() === name.toLowerCase() ||
      s.shortCode.toLowerCase() === name.toLowerCase() ||
      s.category.toLowerCase() === name.toLowerCase()
  );
}
