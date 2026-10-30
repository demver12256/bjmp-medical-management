import bcrypt from "bcrypt";
import { sequelize } from "../config/database.js";
import {
  Role,
  User,
  Pdl,
  MedicalRecord,
  MedicalExamination,
  Diagnosis,
  Treatment,
  Prescription,
  Medication,
  MedicalRequest,
  HospitalReferral,
  AuditLog
} from "../models/index.js";

export const runSeed = async () => {
  console.log("🌱 Syncing database schema...");
  await sequelize.sync({ force: true });
  console.log("✅ Database schema initialized.");

  // 1. Seed Roles
  console.log("🌱 Seeding Roles...");
  const roles = await Role.bulkCreate([
    {
      role_name: "MedicalOfficer",
      permissions: [
        "pdl:view",
        "exam:create",
        "exam:view",
        "diagnosis:create",
        "treatment:manage",
        "rx:authorize",
        "referral:create",
        "referral:view",
        "referral:manage",
        "alert:acknowledge",
        "abstract:print"
      ]
    },
    {
      role_name: "Nurse",
      permissions: [
        "pdl:create",
        "pdl:view",
        "triage:create",
        "observation:create",
        "rx:dispense",
        "alert:view"
      ]
    },
    {
      role_name: "JailOfficer",
      permissions: [
        "pdl:view",
        "request:create",
        "referral:escort",
        "referral:view"
      ]
    },
    {
      role_name: "SystemAdministrator",
      permissions: ["*"]
    }
  ]);

  const roleMap = {};
  roles.forEach((r) => {
    roleMap[r.role_name] = r.role_id;
  });

  // 2. Seed Users
  console.log("🌱 Seeding Officer and Medical Personnel Accounts...");
  const doctorHash = await bcrypt.hash("Doctor123!", 10);
  const nurseHash = await bcrypt.hash("Nurse123!", 10);
  const joHash = await bcrypt.hash("Officer123!", 10);
  const adminHash = await bcrypt.hash("Admin123!", 10);

  const doctor = await User.create({
    full_name: "Dr. Maria Elena Santos, MD",
    username: "dr.santos",
    password_hash: doctorHash,
    role_id: roleMap["MedicalOfficer"],
    account_status: "Active",
    license_number: "PRC-MD-0094821",
    specialization: "Internal Medicine & Correctional Health"
  });

  const nurse = await User.create({
    full_name: "Nurse Juan Dela Cruz, RN",
    username: "nurse.cruz",
    password_hash: nurseHash,
    role_id: roleMap["Nurse"],
    account_status: "Active",
    personnel_id: "BJMP-NURSE-2023-088",
    badge_number: "RN-78321"
  });

  const jailOfficer = await User.create({
    full_name: "JO2 Ricardo 'Cardo' Gomez",
    username: "jo.gomez",
    password_hash: joHash,
    role_id: roleMap["JailOfficer"],
    account_status: "Active",
    personnel_id: "BJMP-JO-2021-0412",
    badge_number: "BADGE-9941"
  });

  const escortOfficer2 = await User.create({
    full_name: "JO1 Mark Anthony Delos Reyes",
    username: "jo.delosreyes",
    password_hash: joHash,
    role_id: roleMap["JailOfficer"],
    account_status: "Active",
    personnel_id: "BJMP-JO-2024-0199",
    badge_number: "BADGE-1024"
  });

  const admin = await User.create({
    full_name: "Alexander Ramos, MIT",
    username: "admin",
    password_hash: adminHash,
    role_id: roleMap["SystemAdministrator"],
    account_status: "Active",
    personnel_id: "BJMP-IT-001"
  });

  // 3. Seed PDLs
  console.log("🌱 Seeding Persons Deprived of Liberty (PDL)...");
  const pdl1 = await Pdl.create({
    pdl_number: "BJMP-MNL-2026-0104",
    full_name: "Juanito 'Totoy' Dela Cruz",
    date_of_birth: "1984-06-15",
    admission_date: "2025-11-10",
    assigned_facility: "Manila City Jail Male Dormitory",
    cell_number: "Brigada 4 - Cell 12"
  });

  const pdl2 = await Pdl.create({
    pdl_number: "BJMP-MNL-2026-0245",
    full_name: "Rodrigo 'Digoy' Mendoza",
    date_of_birth: "1978-02-22",
    admission_date: "2025-08-14",
    assigned_facility: "Manila City Jail Male Dormitory",
    cell_number: "Brigada 5 - Cell 09"
  });

  const pdl3 = await Pdl.create({
    pdl_number: "BJMP-MNL-2026-0318",
    full_name: "Eduardo 'Eddie' Reyes",
    date_of_birth: "1991-09-04",
    admission_date: "2026-01-20",
    assigned_facility: "Manila City Jail Male Dormitory",
    cell_number: "Brigada 2 - Cell 04"
  });

  const pdl4 = await Pdl.create({
    pdl_number: "BJMP-MNL-2026-0419",
    full_name: "Francisco 'Kiko' Balagtas",
    date_of_birth: "1969-12-01",
    admission_date: "2024-04-18",
    assigned_facility: "Manila City Jail Male Dormitory",
    cell_number: "Brigada 1 - Cell 02"
  });

  const pdl5 = await Pdl.create({
    pdl_number: "BJMP-QC-2026-0511",
    full_name: "Danilo 'Danny' Fernandez",
    date_of_birth: "1988-04-12",
    admission_date: "2026-02-01",
    assigned_facility: "Quezon City Jail Male Dormitory",
    cell_number: "Dorm 3 - Cell 06"
  });

  // 4. Seed Medical Records (1:1 with PDLs)
  console.log("🌱 Seeding Medical Records & Clinical Histories...");
  const record1 = await MedicalRecord.create({
    pdl_id: pdl1.pdl_id,
    recorded_by: nurse.user_id,
    record_date: "2025-11-10",
    medical_history: "Chronic Primary Hypertension (5 years). Mild Bronchial Asthma controlled by inhaler. Smoker (10 pack-years).",
    allergies: "Penicillin (rash, facial edema)",
    case_status: "UNDER TREATMENT"
  });

  const record2 = await MedicalRecord.create({
    pdl_id: pdl2.pdl_id,
    recorded_by: nurse.user_id,
    record_date: "2025-08-14",
    medical_history: "Pulmonary Tuberculosis Category 1 completed in 2023. Chronic cough, occasional hemoptysis, recurrent nocturnal fevers.",
    allergies: "No Known Drug Allergies (NKDA)",
    case_status: "REFERRAL PENDING"
  });

  const record3 = await MedicalRecord.create({
    pdl_id: pdl3.pdl_id,
    recorded_by: nurse.user_id,
    record_date: "2026-01-20",
    medical_history: "Type 2 Diabetes Mellitus (HbA1c 8.4%). Peripheral neuropathy. Non-smoker.",
    allergies: "Sulfa drugs",
    case_status: "UNDER EXAMINATION"
  });

  const record4 = await MedicalRecord.create({
    pdl_id: pdl4.pdl_id,
    recorded_by: nurse.user_id,
    record_date: "2024-04-18",
    medical_history: "Coronary Artery Disease post-stenting (2021). Hypertensive heart disease. Dyslipidemia.",
    allergies: "Aspirin (gastric irritation)",
    case_status: "RECOVERY & OBSERVATION"
  });

  const record5 = await MedicalRecord.create({
    pdl_id: pdl5.pdl_id,
    recorded_by: nurse.user_id,
    record_date: "2026-02-01",
    medical_history: "No prior chronic illnesses reported. Complaining of epigastric burning pain aggravated after meals.",
    allergies: "No Known Drug Allergies (NKDA)",
    case_status: "PENDING EVALUATION"
  });

  // 5. Seed Examinations
  console.log("🌱 Seeding Medical Examinations & Vital Signs...");
  await MedicalExamination.create({
    record_id: record1.record_id,
    examination_date: new Date(Date.now() - 24 * 3600 * 1000),
    symptoms: "Occipital throbbing headache, dizziness, mild visual blurring upon standing.",
    findings: "Conscious, coherent, oriented to 3 spheres. Neck veins flat. S1 and S2 distinct with loud S2. No wheezes or rales. Neurological exam grossly intact.",
    vital_signs: {
      blood_pressure: "165/102",
      heart_rate: 98,
      temperature: 37.1,
      spo2: 97,
      respiratory_rate: 20
    },
    conducted_by: doctor.user_id
  });

  await MedicalExamination.create({
    record_id: record2.record_id,
    examination_date: new Date(Date.now() - 12 * 3600 * 1000),
    symptoms: "Productive cough >3 weeks, low-grade afternoon fever, 4kg unintentional weight loss over 1 month, dyspnea on mild exertion.",
    findings: "Pale palpebral conjunctivae, cachectic appearance. Decreased breath sounds and crackles over right upper lung lobe. No digital clubbing.",
    vital_signs: {
      blood_pressure: "115/75",
      heart_rate: 112,
      temperature: 38.7,
      spo2: 92,
      respiratory_rate: 26
    },
    conducted_by: doctor.user_id
  });

  await MedicalExamination.create({
    record_id: record3.record_id,
    examination_date: new Date(Date.now() - 2 * 3600 * 1000),
    symptoms: "Polydipsia, polyuria, tingling numbness on bilateral lower extremities.",
    findings: "Dry mucous membranes. Sensation to monofilament test reduced on plantar surfaces bilaterally. No open sores or diabetic ulcers.",
    vital_signs: {
      blood_pressure: "135/85",
      heart_rate: 84,
      temperature: 36.8,
      spo2: 98,
      respiratory_rate: 18
    },
    conducted_by: nurse.user_id
  });

  // 6. Seed Diagnoses & Treatments & Prescriptions
  console.log("🌱 Seeding Diagnoses, Treatments & Pharmacotherapy...");
  const diagnosis1 = await Diagnosis.create({
    record_id: record1.record_id,
    diagnosis_description: "Hypertension Stage 2 (Uncontrolled) with symptomatic Cephalea; Rule out Hypertensive Urgency.",
    diagnosis_date: new Date(Date.now() - 20 * 3600 * 1000),
    created_by: doctor.user_id
  });

  const treatment1 = await Treatment.create({
    diagnosis_id: diagnosis1.diagnosis_id,
    treatment_plan: "Intensify anti-hypertensive dual therapy. Low-salt low-fat diet. Daily BP monitoring at 0800H and 1600H. Re-evaluate in 7 days.",
    start_date: "2026-10-25",
    treatment_status: "Active"
  });

  const prescription1 = await Prescription.create({
    treatment_id: treatment1.treatment_id,
    prescription_date: new Date(Date.now() - 20 * 3600 * 1000),
    dosage_instructions: "Amlodipine 10mg OD PO in the morning; Losartan Potassium 50mg OD PO at bedtime; Paracetamol 500mg tab PRN for headache.",
    prescription_status: "Dispensed",
    authorized_by: doctor.user_id
  });

  await Medication.bulkCreate([
    {
      prescription_id: prescription1.prescription_id,
      medication_name: "Amlodipine Besylate",
      dosage: "10 mg tablet",
      instructions: "Take 1 tablet orally every morning with water."
    },
    {
      prescription_id: prescription1.prescription_id,
      medication_name: "Losartan Potassium",
      dosage: "50 mg tablet",
      instructions: "Take 1 tablet orally every night at bedtime."
    },
    {
      prescription_id: prescription1.prescription_id,
      medication_name: "Paracetamol",
      dosage: "500 mg tablet",
      instructions: "Take 1 tablet every 6 hours PRN for severe head pain (max 3g/day)."
    }
  ]);

  const diagnosis2 = await Diagnosis.create({
    record_id: record2.record_id,
    diagnosis_description: "Suspected Recurrent Pulmonary Tuberculosis with Hemoptysis; Severe Malnutrition; Urgent chest radiography and GeneXpert indicated.",
    diagnosis_date: new Date(Date.now() - 10 * 3600 * 1000),
    created_by: doctor.user_id
  });

  // 7. Seed Hospital Referral
  console.log("🌱 Seeding Hospital Referrals & Escort Missions...");
  await HospitalReferral.create({
    record_id: record2.record_id,
    referral_date: new Date(Date.now() - 8 * 3600 * 1000),
    reason: "Urgent need for GeneXpert MTB/RIF assay, contrast Chest CT, and pulmonology inpatient isolation (facility lacking negative pressure booth).",
    destination_hospital: "Philippine General Hospital (PGH) - Division of Pulmonary Medicine",
    referral_status: "Escort Requested",
    authorized_by: doctor.user_id,
    escort_officer_id: jailOfficer.user_id,
    vehicle_plate: "SAB-4412 (BJMP Escort Van 02)",
    escort_notes: "Armed escort detail: JO2 Gomez (Lead) + JO1 Delos Reyes (Rear Security). Maximum security restraints applied per BJMP SOP 2024-03."
  });

  // 8. Seed Custody Medical Checkup Requests
  console.log("🌱 Seeding Jail Officer Medical Requests...");
  await MedicalRequest.create({
    pdl_id: pdl3.pdl_id,
    submitted_by: jailOfficer.user_id,
    reason_for_request: "PDL complained during morning headcount of blurred vision and numbness in hands/feet. Requested physician consult.",
    priority: "Normal",
    request_status: "Reviewed"
  });

  await MedicalRequest.create({
    pdl_id: pdl5.pdl_id,
    submitted_by: jailOfficer.user_id,
    reason_for_request: "Severe acute abdominal pain, nausea and vomiting after mess intake. Suspected acute gastroenteritis / gastritis.",
    priority: "Urgent",
    request_status: "Pending"
  });

  // 9. Seed Audit Logs
  console.log("🌱 Seeding Immutable Audit Trail Logs...");
  await AuditLog.bulkCreate([
    {
      user_id: admin.user_id,
      action: "SYSTEM_INITIALIZED",
      module: "Security Core",
      details: "BJMP Medical Officer Management System online. Encryption keys verified, RBAC roles active.",
      ip_address: "127.0.0.1",
      timestamp: new Date(Date.now() - 48 * 3600 * 1000)
    },
    {
      user_id: doctor.user_id,
      action: "AUTH_SUCCESS",
      module: "Security",
      details: "User dr.santos (MedicalOfficer) logged in via secure station terminal.",
      ip_address: "192.168.1.101",
      timestamp: new Date(Date.now() - 24 * 3600 * 1000)
    },
    {
      user_id: doctor.user_id,
      action: "CLINICAL_EXAM_FINALIZED",
      module: "Clinical Consultation",
      details: "Medical Officer finalized consultation for PDL Juanito Dela Cruz (BJMP-MNL-2026-0104). Diagnosis: Hypertension Stage 2.",
      ip_address: "192.168.1.101",
      timestamp: new Date(Date.now() - 20 * 3600 * 1000)
    },
    {
      user_id: doctor.user_id,
      action: "REFERRAL_DRAFTED",
      module: "Hospital Referrals",
      details: "Drafted hospital referral for PDL Rodrigo Mendoza to Philippine General Hospital (PGH). Reason: GeneXpert MTB/RIF + isolation.",
      ip_address: "192.168.1.101",
      timestamp: new Date(Date.now() - 8 * 3600 * 1000)
    },
    {
      user_id: jailOfficer.user_id,
      action: "ESCORT_ASSIGNED",
      module: "Hospital Referrals",
      details: "JO2 Ricardo Gomez assigned as primary escort for Referral #1 to PGH using vehicle SAB-4412.",
      ip_address: "192.168.1.145",
      timestamp: new Date(Date.now() - 6 * 3600 * 1000)
    }
  ]);

  console.log("✅ BJMP Medical Officer Management System Database successfully seeded!");
  return true;
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
