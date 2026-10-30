import { sequelize } from "../config/database.js";
import { pdlRepository } from "../repositories/pdlRepository.js";
import { medicalRecordRepository } from "../repositories/medicalRecordRepository.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

export const pdlService = {
  registerPdlWithRecord: async (pdlData, recordedByUserId, initialMedicalInfo = {}, ipAddress = "127.0.0.1") => {
    const existing = await pdlRepository.findByPdlNumber(pdlData.pdl_number);
    if (existing) {
      throw new Error(`A PDL record with booking number "${pdlData.pdl_number}" already exists in the system.`);
    }

    const transaction = await sequelize.transaction();

    try {
      const pdl = await pdlRepository.create(
        {
          pdl_number: pdlData.pdl_number,
          full_name: pdlData.full_name,
          date_of_birth: pdlData.date_of_birth,
          admission_date: pdlData.admission_date,
          assigned_facility: pdlData.assigned_facility,
          cell_number: pdlData.cell_number
        },
        { transaction }
      );

      const medicalRecord = await medicalRecordRepository.create(
        {
          pdl_id: pdl.pdl_id,
          recorded_by: recordedByUserId,
          record_date: new Date(),
          medical_history: initialMedicalInfo.medical_history || "No prior recorded chronic medical conditions on initial intake.",
          allergies: initialMedicalInfo.allergies || "No Known Drug Allergies (NKDA)",
          case_status: "PENDING EVALUATION"
        },
        { transaction }
      );

      await transaction.commit();

      await writeAuditLog({
        userId: recordedByUserId,
        action: "PDL_REGISTERED",
        module: "PDL Registry",
        details: `Registered new PDL: ${pdl.full_name} (${pdl.pdl_number}) at ${pdl.assigned_facility}. Created initial Medical Record ID: ${medicalRecord.record_id}.`,
        ipAddress
      });

      return { pdl, medicalRecord };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  searchPdls: async (queryStr = "", limit = 50) => {
    return await pdlRepository.search(queryStr, limit);
  },

  getPdlDetails: async (pdlId) => {
    const pdl = await pdlRepository.findById(pdlId, true);
    if (!pdl) {
      throw new Error(`PDL with ID ${pdlId} not found.`);
    }
    return pdl;
  },

  getFullHealthcareProfile: async (pdlId) => {
    const record = await medicalRecordRepository.findByPdlId(pdlId);
    if (!record) {
      throw new Error(`No medical record found for PDL ID ${pdlId}.`);
    }
    return record;
  }
};
