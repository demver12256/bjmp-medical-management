import { authService } from "../services/authService.js";

export const authController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Both username and password are required."
        });
      }

      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const result = await authService.login(username, password, String(ip));

      // Also set token in session for SSR view support
      if (req.session) {
        req.session.token = result.token;
        req.session.userId = result.user.user_id;
        req.session.role = result.user.role;
      }

      return res.status(200).json({
        success: true,
        message: `Welcome, ${result.user.full_name}!`,
        ...result
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message || "Authentication failed."
      });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      return res.status(200).json({
        success: true,
        user: req.user
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  logout: async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy();
      }
      return res.status(200).json({
        success: true,
        message: "Successfully logged out."
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
