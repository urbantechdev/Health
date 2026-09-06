export interface SpecialistDefinition {
  id: string;
  name: string; // e.g. "Cardiologist"
  category: "Medical Specialists" | "Surgical Specialists" | "Cancer Care (Oncology)" | "Women's Health & Pediatrics" | "Skin, Senses & Immunity" | "Mental Health & Critical Care" | "Primary Care & Dentistry";
  department: "doctor" | "laboratory" | "radiology" | "gyna" | "labour_room" | "emergency" | string;
  description: string;
  focusAreas: string;
  shortCode: string;
  defaultRoom?: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}

export interface SpecialistCategoryGroup {
  id: string;
  title: string;
  badge: string;
  description: string;
  specialists: SpecialistDefinition[];
}

export const HOSPITAL_SPECIALISTS_DIRECTORY: SpecialistDefinition[] = [
  // 1. Medical Specialists / Internal Medicine
  {
    id: "spec-cardiology",
    name: "Cardiologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Focuses on the heart and blood vessels (e.g., Interventional Cardiologist, Electrophysiologist).",
    focusAreas: "Heart failure, arrhythmias, hypertension, coronary artery disease, ECG, ECHO, cardiac catheterization",
    shortCode: "CARD",
    defaultRoom: "Room 104 - Cardiac Clinic",
    colorBg: "bg-red-50",
    colorText: "text-red-700",
    colorBorder: "border-red-200"
  },
  {
    id: "spec-pulmonology",
    name: "Pulmonologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Focuses on the respiratory system, lungs, and breathing disorders.",
    focusAreas: "Asthma, COPD, pneumonia, tuberculosis, pulmonary fibrosis, sleep apnea, spirometry",
    shortCode: "PULM",
    defaultRoom: "Room 106 - Chest & Lung Unit",
    colorBg: "bg-cyan-50",
    colorText: "text-cyan-700",
    colorBorder: "border-cyan-200"
  },
  {
    id: "spec-gastroenterology",
    name: "Gastroenterologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Specializes in the digestive tract, liver, gallbladder, and pancreas.",
    focusAreas: "Acid reflux (GERD), ulcers, IBD, Crohn's, hepatitis, liver cirrhosis, endoscopy, colonoscopy",
    shortCode: "GASTRO",
    defaultRoom: "Room 108 - GI & Endoscopy Suite",
    colorBg: "bg-amber-50",
    colorText: "text-amber-700",
    colorBorder: "border-amber-200"
  },
  {
    id: "spec-endocrinology",
    name: "Endocrinologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Treats hormone-related conditions, metabolism, and glands, including diabetes and thyroid disorders.",
    focusAreas: "Type 1 & 2 Diabetes, hyperthyroidism, hypothyroidism, pituitary disorders, adrenal insufficiency, osteoporosis",
    shortCode: "ENDO",
    defaultRoom: "Room 110 - Metabolic Health Clinic",
    colorBg: "bg-emerald-50",
    colorText: "text-emerald-700",
    colorBorder: "border-emerald-200"
  },
  {
    id: "spec-nephrology",
    name: "Nephrologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Specializes in kidney care and dialysis management.",
    focusAreas: "Chronic Kidney Disease (CKD), acute renal failure, dialysis oversight, electrolyte imbalances, glomerulonephritis",
    shortCode: "NEPH",
    defaultRoom: "Room 112 - Renal & Dialysis Clinic",
    colorBg: "bg-blue-50",
    colorText: "text-blue-700",
    colorBorder: "border-blue-200"
  },
  {
    id: "spec-neurology",
    name: "Neurologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Focuses on disorders of the brain, spinal cord, and nervous system.",
    focusAreas: "Stroke, epilepsy, migraines, Parkinson's disease, multiple sclerosis, neuropathies, memory disorders",
    shortCode: "NEURO",
    defaultRoom: "Room 114 - Neurosciences Clinic",
    colorBg: "bg-violet-50",
    colorText: "text-violet-700",
    colorBorder: "border-violet-200"
  },
  {
    id: "spec-rheumatology",
    name: "Rheumatologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Treats autoimmune diseases, joint inflammation, arthritis, and musculoskeletal pain.",
    focusAreas: "Rheumatoid arthritis, lupus (SLE), gout, scleroderma, ankylosing spondylitis, fibromyalgia",
    shortCode: "RHEUM",
    defaultRoom: "Room 116 - Autoimmune & Joint Clinic",
    colorBg: "bg-purple-50",
    colorText: "text-purple-700",
    colorBorder: "border-purple-200"
  },
  {
    id: "spec-hematology",
    name: "Hematologist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Focuses on blood disorders, bone marrow, and lymphatic conditions.",
    focusAreas: "Anemias, sickle cell disease, hemophilia, blood clots (DVT/PE), thrombocytopenia, leukemia & lymphoma screening",
    shortCode: "HEM",
    defaultRoom: "Room 118 - Blood Health Unit",
    colorBg: "bg-rose-50",
    colorText: "text-rose-700",
    colorBorder: "border-rose-200"
  },
  {
    id: "spec-infectious-disease",
    name: "Infectious Disease Specialist",
    category: "Medical Specialists",
    department: "doctor",
    description: "Manages complex, chronic, or rare infections caused by bacteria, viruses, fungi, or parasites.",
    focusAreas: "HIV/AIDS, multidrug-resistant tuberculosis, tropical fevers, sepsis, hospital-acquired infections, travel medicine",
    shortCode: "INF-DIS",
    defaultRoom: "Room 120 - Infectious Disease Unit",
    colorBg: "bg-teal-50",
    colorText: "text-teal-700",
    colorBorder: "border-teal-200"
  },

  // 2. Surgical Specialists
  {
    id: "spec-general-surgery",
    name: "General Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Performs a wide variety of abdominal, soft tissue, and emergency surgeries.",
    focusAreas: "Appendectomy, hernia repairs, cholecystectomy (gallbladder), bowel resections, emergency trauma surgery",
    shortCode: "SURG-GEN",
    defaultRoom: "Surgical Suite 1",
    colorBg: "bg-slate-50",
    colorText: "text-slate-700",
    colorBorder: "border-slate-200"
  },
  {
    id: "spec-orthopedic-surgery",
    name: "Orthopedic Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Specializes in bones, joints, ligaments, tendons, and muscles (e.g., joint replacements, spine surgery).",
    focusAreas: "Fracture fixations, total hip & knee replacements, ACL reconstruction, spinal disc repairs, sports injuries",
    shortCode: "ORTHO",
    defaultRoom: "Surgical Suite 2 - Orthopedic Clinic",
    colorBg: "bg-amber-50",
    colorText: "text-amber-700",
    colorBorder: "border-amber-200"
  },
  {
    id: "spec-neurosurgery",
    name: "Neurosurgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Operates on the brain, spine, and central nervous system.",
    focusAreas: "Brain tumor excisions, intracranial hemorrhage evacuation, spinal fusion, aneurysm clipping, traumatic brain injury",
    shortCode: "NEURO-SURG",
    defaultRoom: "Surgical Suite 3 - Neurosurgery",
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-700",
    colorBorder: "border-indigo-200"
  },
  {
    id: "spec-cardiothoracic-surgery",
    name: "Cardiothoracic Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Performs surgery on the heart, lungs, and chest cavity.",
    focusAreas: "Coronary artery bypass grafting (CABG), heart valve repair/replacement, lung lobectomy, thoracic trauma",
    shortCode: "CT-SURG",
    defaultRoom: "Surgical Suite 4 - Cardiac Theatre",
    colorBg: "bg-red-50",
    colorText: "text-red-700",
    colorBorder: "border-red-200"
  },
  {
    id: "spec-plastic-surgery",
    name: "Plastic and Reconstructive Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Focuses on cosmetic enhancements, burn care, and reconstructive tissue repairs.",
    focusAreas: "Burn contracture releases, skin grafting, cleft lip repair, post-mastectomy breast reconstruction, scar revision",
    shortCode: "PLAST-SURG",
    defaultRoom: "Room 122 - Reconstructive Clinic",
    colorBg: "bg-pink-50",
    colorText: "text-pink-700",
    colorBorder: "border-pink-200"
  },
  {
    id: "spec-colorectal-surgery",
    name: "Colorectal Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Specializes in surgical and non-surgical treatment of the colon, rectum, and anus.",
    focusAreas: "Colorectal cancer resection, hemorrhoidectomy, anal fistula repair, diverticular surgery, stoma care",
    shortCode: "COL-SURG",
    defaultRoom: "Room 124 - Proctology Suite",
    colorBg: "bg-orange-50",
    colorText: "text-orange-700",
    colorBorder: "border-orange-200"
  },
  {
    id: "spec-vascular-surgery",
    name: "Vascular Surgeon",
    category: "Surgical Specialists",
    department: "doctor",
    description: "Operates on blood vessels outside the heart and brain (arteries and veins).",
    focusAreas: "Peripheral artery bypass, carotid endarterectomy, varicose vein ablation, aneurysm repair, dialysis AV fistulas",
    shortCode: "VASC-SURG",
    defaultRoom: "Room 126 - Vascular Suite",
    colorBg: "bg-sky-50",
    colorText: "text-sky-700",
    colorBorder: "border-sky-200"
  },

  // 3. Cancer Care (Oncology)
  {
    id: "spec-medical-oncology",
    name: "Medical Oncologist",
    category: "Cancer Care (Oncology)",
    department: "doctor",
    description: "Uses chemotherapy, immunotherapy, and targeted drugs to treat cancer.",
    focusAreas: "Systemic chemotherapy regimens, immune checkpoint inhibitors, targeted biological therapies, cancer pain management",
    shortCode: "MED-ONC",
    defaultRoom: "Room 201 - Oncology Day Care",
    colorBg: "bg-fuchsia-50",
    colorText: "text-fuchsia-700",
    colorBorder: "border-fuchsia-200"
  },
  {
    id: "spec-radiation-oncology",
    name: "Radiation Oncologist",
    category: "Cancer Care (Oncology)",
    department: "radiology",
    description: "Uses specialized radiation therapy to destroy cancer cells.",
    focusAreas: "External beam radiation (EBRT), IMRT, stereotactic radiotherapy, brachytherapy, palliative radiation",
    shortCode: "RAD-ONC",
    defaultRoom: "Radiotherapy Bunker 1",
    colorBg: "bg-purple-50",
    colorText: "text-purple-700",
    colorBorder: "border-purple-200"
  },
  {
    id: "spec-surgical-oncology",
    name: "Surgical Oncologist",
    category: "Cancer Care (Oncology)",
    department: "doctor",
    description: "Surgically removes tumors and cancerous tissue.",
    focusAreas: "Mastectomies, lymph node dissections, sarcoma resections, organ-preserving oncologic surgeries",
    shortCode: "SURG-ONC",
    defaultRoom: "Surgical Suite 5 - Oncologic Surgery",
    colorBg: "bg-violet-50",
    colorText: "text-violet-700",
    colorBorder: "border-violet-200"
  },
  {
    id: "spec-gynecologic-oncology",
    name: "Gynecologic Oncologist",
    category: "Cancer Care (Oncology)",
    department: "gyna",
    description: "Focuses on cancers of the female reproductive system.",
    focusAreas: "Cervical cancer, ovarian tumors, endometrial cancer, vulvar carcinoma, radical hysterectomy",
    shortCode: "GYN-ONC",
    defaultRoom: "Room 204 - Gynae-Oncology Unit",
    colorBg: "bg-rose-50",
    colorText: "text-rose-700",
    colorBorder: "border-rose-200"
  },

  // 4. Women’s Health, Pregnancy, and Children
  {
    id: "spec-ob-gyn",
    name: "Obstetrician-Gynecologist (OB-GYN)",
    category: "Women's Health & Pediatrics",
    department: "gyna",
    description: "Focuses on women's reproductive health, pregnancy, and childbirth.",
    focusAreas: "Antenatal care, high-risk labor & delivery, Cesarean sections, fibroids, PCOS, fertility evaluations",
    shortCode: "OB-GYN",
    defaultRoom: "Room 206 - Maternal Health Suite",
    colorBg: "bg-pink-50",
    colorText: "text-pink-700",
    colorBorder: "border-pink-200"
  },
  {
    id: "spec-pediatrician",
    name: "Pediatrician",
    category: "Women's Health & Pediatrics",
    department: "doctor",
    description: "Specializes in the medical care of infants, children, and adolescents.",
    focusAreas: "Childhood immunizations, developmental milestones, pediatric infections, asthma in children, nutrition",
    shortCode: "PEDS",
    defaultRoom: "Room 208 - Child Wellness Clinic",
    colorBg: "bg-lime-50",
    colorText: "text-lime-700",
    colorBorder: "border-lime-200"
  },
  {
    id: "spec-neonatologist",
    name: "Neonatologist",
    category: "Women's Health & Pediatrics",
    department: "labour_room",
    description: "A sub-specialty of pediatrics focused on the care of newborn babies, especially ill or premature infants.",
    focusAreas: "NICU management, premature infant respiratory distress, neonatal jaundice, congenital anomalies, infant resuscitation",
    shortCode: "NEO-NAT",
    defaultRoom: "NICU - Special Baby Care Unit",
    colorBg: "bg-emerald-50",
    colorText: "text-emerald-700",
    colorBorder: "border-emerald-200"
  },
  {
    id: "spec-geriatrician",
    name: "Geriatrician",
    category: "Women's Health & Pediatrics",
    department: "doctor",
    description: "Specializes in the healthcare needs and diseases of older adults.",
    focusAreas: "Polypharmacy reviews, dementia & Alzheimer's, fall prevention, frailty syndromes, palliative senior care",
    shortCode: "GERI",
    defaultRoom: "Room 210 - Senior Living Clinic",
    colorBg: "bg-slate-50",
    colorText: "text-slate-700",
    colorBorder: "border-slate-200"
  },

  // 5. Skin, Senses, and Immunity
  {
    id: "spec-dermatologist",
    name: "Dermatologist",
    category: "Skin, Senses & Immunity",
    department: "doctor",
    description: "Focuses on conditions related to the skin, hair, and nails.",
    focusAreas: "Eczema, psoriasis, acne, skin cancer screenings, fungal infections, alopecia, dermatoscopy",
    shortCode: "DERM",
    defaultRoom: "Room 212 - Dermatology Suite",
    colorBg: "bg-amber-50",
    colorText: "text-amber-700",
    colorBorder: "border-amber-200"
  },
  {
    id: "spec-ophthalmologist",
    name: "Ophthalmologist",
    category: "Skin, Senses & Immunity",
    department: "doctor",
    description: "Medical doctor specializing in eye and vision care, including eye surgery.",
    focusAreas: "Cataracts surgery, glaucoma management, diabetic retinopathy, macular degeneration, refractive errors",
    shortCode: "OPHTH",
    defaultRoom: "Room 214 - Eye Care Clinic",
    colorBg: "bg-blue-50",
    colorText: "text-blue-700",
    colorBorder: "border-blue-200"
  },
  {
    id: "spec-ent",
    name: "Otolaryngologist (ENT)",
    category: "Skin, Senses & Immunity",
    department: "doctor",
    description: "Focuses on ear, nose, throat, and related head and neck structures.",
    focusAreas: "Chronic sinusitis, hearing loss, tonsillitis, vertigo, vocal cord polyps, sleep apnea surgery, thyroid nodules",
    shortCode: "ENT",
    defaultRoom: "Room 216 - ENT Specialist Suite",
    colorBg: "bg-teal-50",
    colorText: "text-teal-700",
    colorBorder: "border-teal-200"
  },
  {
    id: "spec-allergist-immunologist",
    name: "Allergist / Immunologist",
    category: "Skin, Senses & Immunity",
    department: "doctor",
    description: "Treats immune system disorders, allergies, and asthma.",
    focusAreas: "Severe food allergies, anaphylaxis, allergic rhinitis, primary immunodeficiency disorders, allergy skin prick testing",
    shortCode: "ALLERG",
    defaultRoom: "Room 218 - Allergy & Immunology Lab",
    colorBg: "bg-yellow-50",
    colorText: "text-yellow-700",
    colorBorder: "border-yellow-200"
  },

  // 6. Mental Health & Emergency Care
  {
    id: "spec-psychiatrist",
    name: "Psychiatrist",
    category: "Mental Health & Critical Care",
    department: "doctor",
    description: "Medical doctor who diagnoses and treats mental health, emotional, and behavioral disorders (can prescribe medication).",
    focusAreas: "Major depression, bipolar disorder, schizophrenia, anxiety disorders, PTSD, substance use disorders",
    shortCode: "PSYCH",
    defaultRoom: "Room 301 - Behavioral Health Suite",
    colorBg: "bg-indigo-50",
    colorText: "text-indigo-700",
    colorBorder: "border-indigo-200"
  },
  {
    id: "spec-emergency-medicine",
    name: "Emergency Medicine Specialist",
    category: "Mental Health & Critical Care",
    department: "doctor",
    description: "Manages acute illnesses and life-threatening trauma in emergency departments.",
    focusAreas: "Cardiac arrest, polytrauma, acute stroke resuscitation, respiratory failure, toxicology, acute surgical triage",
    shortCode: "ER-SPEC",
    defaultRoom: "Emergency Resuscitation Bay",
    colorBg: "bg-rose-50",
    colorText: "text-rose-700",
    colorBorder: "border-rose-200"
  },
  {
    id: "spec-anesthesiologist",
    name: "Anesthesiologist",
    category: "Mental Health & Critical Care",
    department: "doctor",
    description: "Administers anesthesia and manages pain management during surgeries or critical care.",
    focusAreas: "General anesthesia, spinal & epidural blocks, ICU sedation, perioperative hemodynamic stabilization, chronic pain",
    shortCode: "ANESTH",
    defaultRoom: "Main Operating Theatres & PACU",
    colorBg: "bg-slate-50",
    colorText: "text-slate-700",
    colorBorder: "border-slate-200"
  },
  {
    id: "spec-radiologist",
    name: "Radiologist",
    category: "Mental Health & Critical Care",
    department: "radiology",
    description: "Interprets medical imaging tests (X-rays, MRIs, CT scans, ultrasounds).",
    focusAreas: "Digital X-Ray, contrast CT imaging, High-field MRI reporting, Doppler ultrasound, interventional biopsy guidance",
    shortCode: "RAD",
    defaultRoom: "Radiology Diagnostic Console Suite",
    colorBg: "bg-purple-50",
    colorText: "text-purple-700",
    colorBorder: "border-purple-200"
  },

  // Primary Care & Dentistry
  {
    id: "spec-gp",
    name: "General Practitioner (GP)",
    category: "Primary Care & Dentistry",
    department: "doctor",
    description: "Primary medical doctor for comprehensive health assessments, routine evaluations, and patient referral coordination.",
    focusAreas: "Primary care triage, outpatient consultations, preventive health checkups, chronic disease monitoring",
    shortCode: "GP",
    defaultRoom: "Consultation Rooms 101 - 103",
    colorBg: "bg-emerald-50",
    colorText: "text-emerald-700",
    colorBorder: "border-emerald-200"
  },
  {
    id: "spec-dentist",
    name: "Dentist / Dental Surgeon",
    category: "Primary Care & Dentistry",
    department: "doctor",
    description: "Comprehensive oral health, dental extractions, restorative treatments, and maxillofacial examinations.",
    focusAreas: "Root canals, dental cleanings, restorative fillings, orthodontic evaluations, tooth extractions",
    shortCode: "DENT",
    defaultRoom: "Dental Clinic Suite 105",
    colorBg: "bg-teal-50",
    colorText: "text-teal-700",
    colorBorder: "border-teal-200"
  }
];

export const SPECIALIST_CATEGORIES: SpecialistCategoryGroup[] = [
  {
    id: "cat-internal-med",
    title: "1. Medical Specialists (Internal Medicine)",
    badge: "9 Specialties",
    description: "Organ system specialists managing complex acute and chronic non-surgical diseases.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Medical Specialists")
  },
  {
    id: "cat-surgical",
    title: "2. Surgical Specialists",
    badge: "7 Specialties",
    description: "Operative surgeons with advanced training in invasive and minimally invasive procedural interventions.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Surgical Specialists")
  },
  {
    id: "cat-cancer",
    title: "3. Cancer Care (Oncology)",
    badge: "4 Specialties",
    description: "Multidisciplinary oncologists delivering chemotherapy, radiation therapy, and surgical tumor removals.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Cancer Care (Oncology)")
  },
  {
    id: "cat-women-child",
    title: "4. Women’s Health, Pregnancy & Children",
    badge: "4 Specialties",
    description: "Comprehensive care for maternal health, newborns (NICU), pediatric development, and geriatric medicine.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Women's Health & Pediatrics")
  },
  {
    id: "cat-skin-senses",
    title: "5. Skin, Senses & Immunity",
    badge: "4 Specialties",
    description: "Specialized diagnostics and therapy for dermatology, ophthalmology (eyes), ENT, and immunologic allergies.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Skin, Senses & Immunity")
  },
  {
    id: "cat-mental-emergency",
    title: "6. Mental Health, Emergency & Critical Care",
    badge: "4 Specialties",
    description: "Psychiatric clinical care, emergency trauma resuscitation, surgical anesthesia, and advanced radiology.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Mental Health & Critical Care")
  },
  {
    id: "cat-primary-care",
    title: "7. Primary Care & Oral Health",
    badge: "2 Specialties",
    description: "Frontline General Practitioners (GP) and Dental Surgeons managing outpatient intake and wellness.",
    specialists: HOSPITAL_SPECIALISTS_DIRECTORY.filter(s => s.category === "Primary Care & Dentistry")
  }
];

export function getSpecialistByName(name: string): SpecialistDefinition | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return HOSPITAL_SPECIALISTS_DIRECTORY.find(
    s => s.name.toLowerCase() === clean || clean.includes(s.name.toLowerCase()) || s.id.toLowerCase() === clean
  );
}

export function getAllSpecialtyNames(): string[] {
  return HOSPITAL_SPECIALISTS_DIRECTORY.map(s => s.name);
}
