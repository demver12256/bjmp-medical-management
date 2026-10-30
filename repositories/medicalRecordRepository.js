import {
  MedicalRecord,
  Pdl,
  User,
  MedicalExamination,
  Diagnosis,
  Treatment,
  Prescription,
  Medication,
  HospitalReferral,
  Appointment
} from "../models/index.js";

export const medicalRecordRepository = {
  create: async (data, options = {}) => {
    return await MedicalRecord.create(data, options);
  },

  findByPdlId: async (pdlId) => {
    return await MedicalRecord.findOne({
      where: { pdl_id: pdlId },
      include: [
        { model: Pdl, as: "pdl" },
        { model: User, as: "recorder", attributes: ["user_id", "full_name", "username"] },
        {
          model: MedicalExamination,
          as: "examinations",
          include: [{ model: User, as: "examiner", attributes: ["user_id", "full_name"] }],
          order: [["examination_date", "DESC"]]
        },
        {
          model: Diagnosis,
          as: "diagnoses",
          include: [
            { model: User, as: "doctor", attributes: ["user_id", "full_name", "license_number"] },
            {
              model: Treatment,
              as: "treatments",
              include: [
                {
                  model: Prescription,
                  as: "prescriptions",
                  include: [{ model: Medication, as: "medications" }]
                }
              ]
            }
          ],
          order: [["diagnosis_date", "DESC"]]
        },
        {
          model: HospitalReferral,
          as: "hospitalReferrals",
          include: [
            { model: User, as: "authorizer", attributes: ["user_id", "full_name"] },
            { model: User, as: "escortOfficer", attributes: ["user_id", "full_name", "badge_number"] }
          ],
          order: [["referral_date", "DESC"]]
        },
        {
          model: Appointment,
          as: "appointments",
          order: [["appointment_date", "DESC"]]
        }
      ]
    });
  },

  findById: async (recordId) => {
    return await MedicalRecord.findByPk(recordId, {
      include: [
        { model: Pdl, as: "pdl" },
        { model: User, as: "recorder", attributes: ["user_id", "full_name"] }
      ]
    });
  },

  updateCaseStatus: async (recordId, caseStatus, options = {}) => {
    const record = await MedicalRecord.findByPk(recordId);
    if (!record) return null;
    record.case_status = caseStatus;
    await record.save(options);
    return record;
  }
};
