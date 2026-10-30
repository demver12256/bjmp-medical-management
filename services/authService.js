import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository.js";
import { generateToken } from "../config/jwt.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

export const authService = {
  login: async (username, password, ipAddress = "127.0.0.1") => {
    const user = await userRepository.findByUsername(username);

    if (!user) {
      await writeAuditLog({
        action: "AUTH_FAILED",
        module: "Security",
        details: `Failed login attempt for nonexistent username: ${username}`,
        ipAddress
      });
      throw new Error("Invalid username or password.");
    }

    if (user.account_status !== "Active") {
      await writeAuditLog({
        userId: user.user_id,
        action: "AUTH_BLOCKED",
        module: "Security",
        details: `Login rejected for inactive/suspended account: ${username}`,
        ipAddress
      });
      throw new Error("This account is currently inactive. Contact your Administrator.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await writeAuditLog({
        userId: user.user_id,
        action: "AUTH_FAILED",
        module: "Security",
        details: `Invalid credentials entered for username: ${username}`,
        ipAddress
      });
      throw new Error("Invalid username or password.");
    }

    const payload = {
      user_id: user.user_id,
      username: user.username,
      role_name: user.role ? user.role.role_name : null,
      full_name: user.full_name
    };

    const token = generateToken(payload);

    await writeAuditLog({
      userId: user.user_id,
      action: "AUTH_SUCCESS",
      module: "Security",
      details: `User ${user.username} (${user.role ? user.role.role_name : "N/A"}) authenticated successfully.`,
      ipAddress
    });

    return {
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        username: user.username,
        role: user.role ? user.role.role_name : null,
        permissions: user.role ? user.role.permissions : [],
        license_number: user.license_number,
        specialization: user.specialization,
        badge_number: user.badge_number,
        personnel_id: user.personnel_id
      }
    };
  },

  getCurrentUser: async (userId) => {
    return await userRepository.findById(userId);
  }
};
