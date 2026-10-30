import { sequelize } from "../config/database.js";
import { medicalRecordRepository } from "../repositories/medicalRecordRepository.js";
import { clinicalRepository } from "../repositories/clinicalRepository.js";
import { referralRepository } from "../repositories/referralRepository.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";
import { vitalAlertService } from "./vitalAlertService.js";

const ALLOWED_STATE_TRANSITIONS = {
  "Case Created": ["PENDING EVALUATION"],
  "PENDING EVALUATION": ["UNDER EXAMINATION"],
  "UNDER EXAMINATION": ["UNDER TREATMENT", "REFERRAL PENDING"],
  "REFERRAL PENDING": ["OUTPATIENT REFERRAL"],
  "OUTPATIENT REFERRAL": ["UNDER TREATMENT"],
  "UNDER TREATMENT": ["RECOVERY & OBSERVATION", "RESOLVED (CLOSED)"],
  "RECOVERY & OBSERVATION": ["RESOLVED (CLOSED)", "UNDER EXAMINATION"],
  "RESOLVED (CLOSED)": ["PENDING EVALUATION"] // Allows case reopening
};

export const clinicalService = {
  validateCaseTransition: (currentStatus, targetStatus) => {
    if (currentStatus === targetStatus) return true;
    const allowed = ALLOWED_STATE_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new Error(
        `Illegal Clinical State Transition: Cannot transition case from "${currentStatus}" to "${targetStatus}". Allowed next states: [${(allowed || []).join(", ")}]`
      );
    }
    return true;
  },

  /**
   * Step 1: Nurse Triage Intake Flow
   * Logs preliminary vitals and symptoms, checks for vital spikes, transitions case to UNDER EXAMINATION
   */
  logTriageIntake: async ({ recordId, nurseUserId, vitalSigns, symptoms, ipAddress = "127.0.0.1" }) => {
    const medicalRecord = await medicalRecordRepository.findById(recordId);
    if (!medicalRecord) {
      throw new Error(`Medical record #${recordId} not found.`);
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Create Examination Entry for Triage
      const examination = await clinicalRepository.createExamination(
        {
          record_id: recordId,
          examination_date: new Date(),
          symptoms,
          findings: "Triage Intake Preliminary Assessment (Nurse Station).",
          vital_signs: vitalSigns,
          conducted_by: nurseUserId
        },
        { transaction }
      );

      // 2. Transition case state from PENDING EVALUATION -> UNDER EXAMINATION
      if (medicalRecord.case_status === "PENDING EVALUATION" || medicalRecord.case_status === "Case Created") {
        medicalRecord.case_status = "UNDER EXAMINATION";
        await medicalRecord.save({ transaction });
      }

      await transaction.commit();

      // Check for vital spikes and trigger biomedical alert simulation if abnormal
      vitalAlertService.evaluateAndTriggerAlert({
        pdl: medicalRecord.pdl,
        vitalSigns,
        recordedByUserId: nurseUserId
      });

      await writeAuditLog({
        userId: nurseUserId,
        action: "TRIAGE_LOGGED",
        module: "Clinical Triage",
        details: `Triage recorded for PDL: ${medicalRecord.pdl ? medicalRecord.pdl.full_name : recordId}. BP: ${vitalSigns.blood_pressure}, HR: ${vitalSigns.heart_rate} bpm, Temp: ${vitalSigns.temperature}°C, SpO2: ${vitalSigns.spo2}%.`,
        ipAddress
      });

      return {
        examination,
        updatedCaseStatus: medicalRecord.case_status
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Step 2 & 3: Medical Officer Full Clinical Examination & Decision
   * Concurrently processes diagnosis, treatment plan, dynamic prescriptions, or hospital referral
   */
  conductExaminationAndDecision: async ({
    recordId,
    doctorId,
    symptoms,
    findings,
    vitalSigns = {},
    diagnosisDescription,
    treatmentPlan = null,
    medications = [],
    prescriptionStatus = "Dispensed",
    referralData = null,
    ipAddress = "127.0.0.1"
  }) => {
    const medicalRecord = await medicalRecordRepository.findById(recordId);
    if (!medicalRecord) {
      throw new Error(`Medical record #${recordId} not found.`);
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Record Medical Examination
      const examination = await clinicalRepository.createExamination(
        {
          record_id: recordId,
          examination_date: new Date(),
          symptoms: symptoms || "As reported during doctor clinical round.",
          findings: findings,
          vital_signs: vitalSigns,
          conducted_by: doctorId
        },
        { transaction }
      );

      // 2. Record Formal Diagnosis
      const diagnosis = await clinicalRepository.createDiagnosis(
        {
          record_id: recordId,
          diagnosis_description: diagnosisDescription,
          diagnosis_date: new Date(),
          created_by: doctorId
        },
        { transaction }
      );

      let treatment = null;
      let prescription = null;
      let createdMedications = [];
      let hospitalReferral = null;
      let targetCaseStatus = "UNDER TREATMENT";

      // 3. Clinical Decision Branch: Medication vs Referral
      if (referralData && referralData.destination_hospital) {
        // Referral Required
        hospitalReferral = await referralRepository.create(
          {
            record_id: recordId,
            referral_date: new Date(),
            reason: referralData.reason || `Urgent specialized care required: ${diagnosisDescription}`,
            destination_hospital: referralData.destination_hospital,
            referral_status: "Drafted",
            authorized_by: doctorId
          },
          { transaction }
        );

        targetCaseStatus = "REFERRAL PENDING";
      } else {
        // Standard Treatment & Prescription
        const plan = treatmentPlan || `Standard pharmacotherapy for ${diagnosisDescription}. Administer prescribed dosage.`;
        treatment = await clinicalRepository.createTreatment(
          {
            diagnosis_id: diagnosis.diagnosis_id,
            treatment_plan: plan,
            start_date: new Date(),
            treatment_status: "Active"
          },
          { transaction }
        );

        if (medications && medications.length > 0) {
          const dosageSummary = medications.map((m) => `${m.medication_name} ${m.dosage}: ${m.instructions}`).join("; ");
          prescription = await clinicalRepository.createPrescription(
            {
              treatment_id: treatment.treatment_id,
              prescription_date: new Date(),
              dosage_instructions: dosageSummary,
              prescription_status: prescriptionStatus,
              authorized_by: doctorId
            },
            { transaction }
          );

          const medicationPayloads = medications.map((m) => ({
            prescription_id: prescription.prescription_id,
            medication_name: m.medication_name,
            dosage: m.dosage,
            instructions: m.instructions
          }));

          createdMedications = await clinicalRepository.createMedications(medicationPayloads, { transaction });
        }

        targetCaseStatus = "UNDER TREATMENT";
      }

      // Enforce state transition rule
      clinicalService.validateCaseTransition(medicalRecord.case_status, targetCaseStatus);
      medicalRecord.case_status = targetCaseStatus;
      await medicalRecord.save({ transaction });

      await transaction.commit();

      // Step 4: Finalization & Audit Trail
      await writeAuditLog({
        userId: doctorId,
        action: "CLINICAL_EXAM_FINALIZED",
        module: "Clinical Consultation",
        details: `Medical Officer finalized consultation for PDL: ${medicalRecord.pdl ? medicalRecord.pdl.full_name : recordId}. Diagnosis: "${diagnosisDescription}". Case Status: ${targetCaseStatus}. ${hospitalReferral ? "Hospital Referral drafted to " + hospitalReferral.destination_hospital : "Prescribed " + createdMedications.length + " medications."}`,
        ipAddress
      });

      return {
        examination,
        diagnosis,
        treatment,
        prescription,
        medications: createdMedications,
        hospitalReferral,
        caseStatus: medicalRecord.case_status
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  /**
   * Updates clinical case status adhering to the State Machine
   */
  updateCaseState: async ({ recordId, newStatus, userId, notes = "", ipAddress = "127.0.0.1" }) => {
    const medicalRecord = await medicalRecordRepository.findById(recordId);
    if (!medicalRecord) {
      throw new Error(`Medical record #${recordId} not found.`);
    }

    clinicalService.validateCaseTransition(medicalRecord.case_status, newStatus);
    const oldStatus = medicalRecord.case_status;
    medicalRecord.case_status = newStatus;
    await medicalRecord.save();

    await writeAuditLog({
      userId,
      action: "CASE_STATE_TRANSITION",
      module: "Case Management",
      details: `Case state transitioned from "${oldStatus}" -> "${newStatus}" for PDL: ${medicalRecord.pdl ? medicalRecord.pdl.full_name : recordId}. Notes: ${notes}`,
      ipAddress
    });

    return medicalRecord;
  },

  /**
   * Log periodic recovery observation (Nurse workflow)
   */
  logObservation: async ({ recordId, nurseUserId, observationNotes, vitalSigns = {}, ipAddress = "127.0.0.1" }) => {
    const record = await medicalRecordRepository.findById(recordId);
    if (!record) throw new Error(`Medical record #${recordId} not found.`);

    const examination = await clinicalRepository.createExamination({
      record_id: recordId,
      examination_date: new Date(),
      symptoms: "Periodic patient observation during recovery / monitoring round.",
      findings: observationNotes,
      vital_signs: vitalSigns,
      conducted_by: nurseUserId
    });

    await writeAuditLog({
      userId: nurseUserId,
      action: "OBSERVATION_LOGGED",
      module: "Patient Monitoring",
      details: `Observation recorded for PDL: ${record.pdl ? record.pdl.full_name : recordId}. Note: ${observationNotes}`,
      ipAddress
    });

    return examination;
  }
};
