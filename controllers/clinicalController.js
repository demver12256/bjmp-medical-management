import { clinicalService } from "../services/clinicalService.js";
import { clinicalRepository } from "../repositories/clinicalRepository.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

export const clinicalController = {
  logTriage: async (req, res) => {
    try {
      const { record_id, vital_signs, symptoms } = req.body;
      const nurseUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const result = await clinicalService.logTriageIntake({
        recordId: record_id,
        nurseUserId,
        vitalSigns: vital_signs,
        symptoms,
        ipAddress: String(ip)
      });

      return res.status(201).json({
        success: true,
        message: "Triage vitals recorded successfully. Patient queue updated.",
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  conductExamination: async (req, res) => {
    try {
      const {
        record_id,
        symptoms,
        findings,
        vital_signs,
        diagnosis_description,
        treatment_plan,
        medications,
        prescription_status,
        referral
      } = req.body;

      const doctorId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const result = await clinicalService.conductExaminationAndDecision({
        recordId: record_id,
        doctorId,
        symptoms,
        findings,
        vitalSigns: vital_signs || {},
        diagnosisDescription: diagnosis_description,
        treatmentPlan: treatment_plan,
        medications: medications || [],
        prescriptionStatus: prescription_status || "Dispensed",
        referralData: referral || null,
        ipAddress: String(ip)
      });

      return res.status(201).json({
        success: true,
        message: "Clinical consultation finalized and committed.",
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  updateCaseState: async (req, res) => {
    try {
      const recordId = req.params.recordId;
      const { case_status, notes } = req.body;
      const userId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const updatedRecord = await clinicalService.updateCaseState({
        recordId,
        newStatus: case_status,
        userId,
        notes: notes || "",
        ipAddress: String(ip)
      });

      return res.status(200).json({
        success: true,
        message: `Case state successfully updated to "${case_status}".`,
        data: updatedRecord
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  logObservation: async (req, res) => {
    try {
      const { record_id, observation_notes, vital_signs } = req.body;
      const nurseUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const result = await clinicalService.logObservation({
        recordId: record_id,
        nurseUserId,
        observationNotes: observation_notes,
        vitalSigns: vital_signs || {},
        ipAddress: String(ip)
      });

      return res.status(201).json({
        success: true,
        message: "Recovery observation note appended.",
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getPrescriptions: async (req, res) => {
    try {
      const status = req.query.status || null;
      const prescriptions = await clinicalRepository.getAllPrescriptions(status);
      return res.status(200).json({
        success: true,
        count: prescriptions.length,
        data: prescriptions
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  dispensePrescription: async (req, res) => {
    try {
      const prescriptionId = req.params.id;
      const updated = await clinicalRepository.updatePrescriptionStatus(prescriptionId, "Dispensed");
      if (!updated) {
        return res.status(404).json({ success: false, message: "Prescription not found." });
      }

      await writeAuditLog({
        userId: req.user.user_id,
        action: "PRESCRIPTION_DISPENSED",
        module: "Pharmacy",
        details: `Prescription #${prescriptionId} dispensed to PDL by ${req.user.full_name}.`
      });

      return res.status(200).json({
        success: true,
        message: "Prescription dispensed successfully.",
        data: updated
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
