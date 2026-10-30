import { requestService } from "../services/requestService.js";

export const requestController = {
  submitRequest: async (req, res) => {
    try {
      const { pdl_id, reason_for_request, priority } = req.body;
      const submittedByUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const request = await requestService.submitCheckupRequest({
        pdlId: pdl_id,
        submittedByUserId,
        reason: reason_for_request,
        priority: priority || "Normal",
        ipAddress: String(ip)
      });

      return res.status(201).json({
        success: true,
        message: "Medical checkup request submitted successfully to medical officers.",
        data: request
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getRequests: async (req, res) => {
    try {
      const status = req.query.status || null;
      const requests = await requestService.getAllRequests(status);
      return res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  updateRequestStatus: async (req, res) => {
    try {
      const requestId = req.params.id;
      const { request_status } = req.body;
      const reviewerUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const updated = await requestService.updateRequestStatus(
        requestId,
        request_status,
        reviewerUserId,
        String(ip)
      );

      return res.status(200).json({
        success: true,
        message: `Medical request status updated to "${request_status}".`,
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
