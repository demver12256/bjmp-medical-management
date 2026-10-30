import {
  MedicalExamination,
  Diagnosis,
  Treatment,
  Prescription,
  Medication,
  User,
  MedicalRecord,
  Pdl
} from "../models/index.js";

export const clinicalRepository = {
  createExamination: async (data, options = {}) => {
    return await MedicalExamination.create(data, options);
  },

  getExaminationsByRecordId: async (recordId) => {
    return await MedicalExamination.findAll({
      where: { record_id: recordId },
      include: [{ model: User, as: "examiner", attributes: ["user_id", "full_name", "license_number"] }],
      order: [["examination_date", "DESC"]]
    });
  },

  createDiagnosis: async (data, options = {}) => {
    return await Diagnosis.create(data, options);
  },

  createTreatment: async (data, options = {}) => {
    return await Treatment.create(data, options);
  },

  createPrescription: async (data, options = {}) => {
    return await Prescription.create(data, options);
  },

  createMedications: async (medicationsArray = [], options = {}) => {
    return await Medication.bulkCreate(medicationsArray, options);
  },

  getAllPrescriptions: async (status = null) => {
    const where = status ? { prescription_status: status } : {};
    return await Prescription.findAll({
      where,
      include: [
        { model: Medication, as: "medications" },
        { model: User, as: "authorizer", attributes: ["user_id", "full_name", "license_number"] },
        {
          model: Treatment,
          as: "treatment",
          include: [
            {
              model: Diagnosis,
              as: "diagnosis",
              include: [
                {
                  model: MedicalRecord,
                  as: "medicalRecord",
                  include: [{ model: Pdl, as: "pdl" }]
                }
              ]
            }
          ]
        }
      ],
      order: [["prescription_date", "DESC"]]
    });
  },

  updatePrescriptionStatus: async (prescriptionId, status) => {
    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) return null;
    prescription.prescription_status = status;
    await prescription.save();
    return prescription;
  },

  getRecentExaminations: async (limit = 10) => {
    return await MedicalExamination.findAll({
      include: [
        { model: User, as: "examiner", attributes: ["user_id", "full_name"] },
        {
          model: MedicalRecord,
          as: "medicalRecord",
          include: [{ model: Pdl, as: "pdl" }]
        }
      ],
      order: [["examination_date", "DESC"]],
      limit
    });
  }
};
