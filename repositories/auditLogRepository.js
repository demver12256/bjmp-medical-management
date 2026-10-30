import { Op } from "sequelize";
import { AuditLog, User } from "../models/index.js";

export const auditLogRepository = {
  create: async (data, options = {}) => {
    return await AuditLog.create(data, options);
  },

  getAll: async ({ module = null, action = null, userId = null, limit = 100 } = {}) => {
    const where = {};
    if (module) where.module = module;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (userId) where.user_id = userId;

    return await AuditLog.findAll({
      where,
      include: [{ model: User, as: "user", attributes: ["user_id", "full_name", "username"] }],
      order: [["timestamp", "DESC"]],
      limit
    });
  }
};
