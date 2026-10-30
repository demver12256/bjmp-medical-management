import { adminService } from "../services/adminService.js";

export const adminController = {
  getSystemOverview: async (req, res) => {
    try {
      const overview = await adminService.getSystemHealthAndStats();
      return res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getUsers: async (req, res) => {
    try {
      const status = req.query.status || null;
      const users = await adminService.getAllUsers(status);
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  createUser: async (req, res) => {
    try {
      const adminUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const user = await adminService.createUser(req.body, adminUserId, String(ip));

      return res.status(201).json({
        success: true,
        message: `Officer account "${user.username}" created successfully.`,
        data: user
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  updateUserStatus: async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const { account_status } = req.body;
      const adminUserId = req.user.user_id;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

      const updated = await adminService.updateUserStatus(
        targetUserId,
        account_status,
        adminUserId,
        String(ip)
      );

      return res.status(200).json({
        success: true,
        message: `User status changed to "${account_status}".`,
        data: updated
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getAuditLogs: async (req, res) => {
    try {
      const { module, action, user_id, limit } = req.query;
      const logs = await adminService.queryAuditLogs({
        module: module || null,
        action: action || null,
        userId: user_id ? Number(user_id) : null,
        limit: limit ? Number(limit) : 100
      });

      return res.status(200).json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
