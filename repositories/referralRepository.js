import { HospitalReferral, MedicalRecord, Pdl, User } from "../models/index.js";

export const referralRepository = {
  create: async (data, options = {}) => {
    return await HospitalReferral.create(data, options);
  },

  findById: async (referralId) => {
    return await HospitalReferral.findByPk(referralId, {
      include: [
        {
          model: MedicalRecord,
          as: "medicalRecord",
          include: [{ model: Pdl, as: "pdl" }]
        },
        { model: User, as: "authorizer", attributes: ["user_id", "full_name", "license_number"] },
        { model: User, as: "escortOfficer", attributes: ["user_id", "full_name", "badge_number", "personnel_id"] }
      ]
    });
  },

  getAll: async (statusFilter = null) => {
    const where = statusFilter ? { referral_status: statusFilter } : {};
    return await HospitalReferral.findAll({
      where,
      include: [
        {
          model: MedicalRecord,
          as: "medicalRecord",
          include: [{ model: Pdl, as: "pdl" }]
        },
        { model: User, as: "authorizer", attributes: ["user_id", "full_name", "license_number"] },
        { model: User, as: "escortOfficer", attributes: ["user_id", "full_name", "badge_number", "personnel_id"] }
      ],
      order: [["referral_date", "DESC"]]
    });
  },

  updateStatus: async (referralId, status, extraFields = {}, options = {}) => {
    const referral = await HospitalReferral.findByPk(referralId);
    if (!referral) return null;

    referral.referral_status = status;
    if (extraFields.escort_officer_id !== undefined) referral.escort_officer_id = extraFields.escort_officer_id;
    if (extraFields.vehicle_plate !== undefined) referral.vehicle_plate = extraFields.vehicle_plate;
    if (extraFields.escort_notes !== undefined) referral.escort_notes = extraFields.escort_notes;
    if (extraFields.discharged_at !== undefined) referral.discharged_at = extraFields.discharged_at;

    await referral.save(options);
    return referral;
  }
};
