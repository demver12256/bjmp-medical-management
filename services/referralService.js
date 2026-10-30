import { referralRepository } from "../repositories/referralRepository.js";
import { medicalRecordRepository } from "../repositories/medicalRecordRepository.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

const ALLOWED_REFERRAL_TRANSITIONS = {
  "Drafted": ["Escort Requested", "Cancelled"],
  "Escort Requested": ["Warden Approved", "Cancelled"],
  "Warden Approved": ["Outpatient Referred"],
  "Outpatient Referred": ["Discharged"],
  "Discharged": []
};

export const referralService = {
  createDraftReferral: async ({ recordId, doctorId, destinationHospital, reason, ipAddress = "127.0.0.1" }) => {
    const referral = await referralRepository.create({
      record_id: recordId,
      referral_date: new Date(),
      destination_hospital: destinationHospital,
      reason,
      referral_status: "Drafted",
      authorized_by: doctorId
    });

    // Update case state to REFERRAL PENDING
    await medicalRecordRepository.updateCaseStatus(recordId, "REFERRAL PENDING");

    await writeAuditLog({
      userId: doctorId,
      action: "REFERRAL_DRAFTED",
      module: "Hospital Referrals",
      details: `Referral #${referral.referral_id} drafted to ${destinationHospital}. Reason: ${reason}`,
      ipAddress
    });

    return referral;
  },

  getAllReferrals: async (statusFilter = null) => {
    return await referralRepository.getAll(statusFilter);
  },

  getReferralById: async (referralId) => {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new Error(`Hospital Referral #${referralId} not found.`);
    }
    return referral;
  },

  updateReferralStatus: async ({ referralId, targetStatus, userId, escortData = {}, ipAddress = "127.0.0.1" }) => {
    const referral = await referralRepository.findById(referralId);
    if (!referral) {
      throw new Error(`Referral #${referralId} not found.`);
    }

    const currentStatus = referral.referral_status;
    const allowed = ALLOWED_REFERRAL_TRANSITIONS[currentStatus];
    if (currentStatus !== targetStatus && (!allowed || !allowed.includes(targetStatus))) {
      throw new Error(`Invalid transition: Cannot advance referral from "${currentStatus}" to "${targetStatus}".`);
    }

    const extraFields = {};
    if (escortData.escort_officer_id) extraFields.escort_officer_id = escortData.escort_officer_id;
    if (escortData.vehicle_plate) extraFields.vehicle_plate = escortData.vehicle_plate;
    if (escortData.escort_notes) extraFields.escort_notes = escortData.escort_notes;
    if (targetStatus === "Discharged") {
      extraFields.discharged_at = new Date();
    }

    const updated = await referralRepository.updateStatus(referralId, targetStatus, extraFields);

    // Sync case status with medical case state machine
    if (referral.medicalRecord) {
      if (targetStatus === "Outpatient Referred") {
        await medicalRecordRepository.updateCaseStatus(referral.medicalRecord.record_id, "OUTPATIENT REFERRAL");
      } else if (targetStatus === "Discharged") {
        // Discharged from hospital returns to UNDER TREATMENT in jail clinic
        await medicalRecordRepository.updateCaseStatus(referral.medicalRecord.record_id, "UNDER TREATMENT");
      }
    }

    await writeAuditLog({
      userId,
      action: "REFERRAL_STATUS_UPDATED",
      module: "Hospital Referrals",
      details: `Referral #${referralId} transitioned from "${currentStatus}" -> "${targetStatus}". Escort Officer: ${escortData.escort_officer_id || referral.escort_officer_id || "Unassigned"}. Vehicle: ${escortData.vehicle_plate || referral.vehicle_plate || "N/A"}`,
      ipAddress
    });

    return updated;
  }
};
