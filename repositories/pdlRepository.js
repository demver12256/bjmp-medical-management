import { Op } from "sequelize";
import { Pdl, MedicalRecord, MedicalExamination, Diagnosis, HospitalReferral } from "../models/index.js";

export const pdlRepository = {
  create: async (data, options = {}) => {
    return await Pdl.create(data, options);
  },

  findById: async (pdlId, includeRelations = true) => {
    const include = includeRelations
      ? [
          {
            model: MedicalRecord,
            as: "medicalRecord",
            include: [
              {
                model: MedicalExamination,
                as: "examinations",
                limit: 5,
                order: [["examination_date", "DESC"]]
              },
              {
                model: Diagnosis,
                as: "diagnoses",
                limit: 5,
                order: [["diagnosis_date", "DESC"]]
              },
              {
                model: HospitalReferral,
                as: "hospitalReferrals",
                limit: 3,
                order: [["referral_date", "DESC"]]
              }
            ]
          }
        ]
      : [];
    return await Pdl.findByPk(pdlId, { include });
  },

  findByPdlNumber: async (pdlNumber) => {
    return await Pdl.findOne({
      where: { pdl_number: pdlNumber },
      include: [{ model: MedicalRecord, as: "medicalRecord" }]
    });
  },

  search: async (queryStr = "", limit = 50) => {
    const trimmed = String(queryStr).trim();
    const where = trimmed
      ? {
          [Op.or]: [
            { pdl_number: { [Op.like]: `%${trimmed}%` } },
            { full_name: { [Op.like]: `%${trimmed}%` } },
            { assigned_facility: { [Op.like]: `%${trimmed}%` } },
            { cell_number: { [Op.like]: `%${trimmed}%` } }
          ]
        }
      : {};

    return await Pdl.findAll({
      where,
      include: [{ model: MedicalRecord, as: "medicalRecord" }],
      order: [["createdAt", "DESC"]],
      limit
    });
  },

  getAll: async (limit = 100) => {
    return await Pdl.findAll({
      include: [{ model: MedicalRecord, as: "medicalRecord" }],
      order: [["createdAt", "DESC"]],
      limit
    });
  }
};
