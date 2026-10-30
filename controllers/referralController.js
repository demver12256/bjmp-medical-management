import { referralService } from "../services/referralService.js";

export const referralController = {
  getReferrals: async (req, res) => {
    try {
      const status = req.query.status || null;
      const referrals = await referralService.getAllReferrals(status);
      return res.status(200).json({
        success: true,
        count: referrals.length,
        data: referrals
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getReferralById: async (req, res) => {
    try {
      const referralId = req.params.id;
      const referral = await referralService.getReferralById(referralId);
      return res.status(200).json({
        success: true,
        data: referral
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  createReferral: async (req, res) => {
    try {
      const { record_id, destination_hospital, reason } = req.body;
      const doctorId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const referral = await referralService.createDraftReferral({
        recordId: record_id,
        doctorId,
        destinationHospital: destination_hospital,
        reason,
        ipAddress: String(ip)
      });

      return res.status(201).json({
        success: true,
        message: "Hospital referral drafted successfully.",
        data: referral
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  updateReferral: async (req, res) => {
    try {
      const referralId = req.params.id;
      const { referral_status, escort_officer_id, vehicle_plate, escort_notes } = req.body;
      const userId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const updated = await referralService.updateReferralStatus({
        referralId,
        targetStatus: referral_status,
        userId,
        escortData: { escort_officer_id, vehicle_plate, escort_notes },
        ipAddress: String(ip)
      });

      return res.status(200).json({
        success: true,
        message: `Referral #${referralId} updated to status "${referral_status}".`,
        data: updated
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};
