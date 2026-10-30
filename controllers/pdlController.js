import { pdlService } from "../services/pdlService.js";

export const pdlController = {
  registerPdl: async (req, res) => {
    try {
      const recordedByUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const { initial_medical_history, initial_allergies, ...pdlData } = req.body;

      const result = await pdlService.registerPdlWithRecord(
        pdlData,
        recordedByUserId,
        {
          medical_history: initial_medical_history,
          allergies: initial_allergies
        },
        String(ip)
      );

      return res.status(201).json({
        success: true,
        message: `PDL ${result.pdl.full_name} (${result.pdl.pdl_number}) registered successfully with Medical Record.`,
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  searchPdls: async (req, res) => {
    try {
      const query = req.query.q || "";
      const limit = Number(req.query.limit) || 50;
      const pdls = await pdlService.searchPdls(query, limit);

      return res.status(200).json({
        success: true,
        count: pdls.length,
        data: pdls
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getPdlById: async (req, res) => {
    try {
      const pdlId = req.params.id;
      const pdl = await pdlService.getPdlDetails(pdlId);

      return res.status(200).json({
        success: true,
        data: pdl
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  getFullHealthcareProfile: async (req, res) => {
    try {
      const pdlId = req.params.id;
      const profile = await pdlService.getFullHealthcareProfile(pdlId);

      return res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
};
