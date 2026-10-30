import { User, Role } from "../models/index.js";

export const userRepository = {
  findByUsername: async (username) => {
    return await User.findOne({
      where: { username },
      include: [{ model: Role, as: "role" }]
    });
  },

  findById: async (userId) => {
    return await User.findByPk(userId, {
      include: [{ model: Role, as: "role" }],
      attributes: { exclude: ["password_hash"] }
    });
  },

  getAll: async (statusFilter = null) => {
    const where = statusFilter ? { account_status: statusFilter } : {};
    return await User.findAll({
      where,
      include: [{ model: Role, as: "role" }],
      attributes: { exclude: ["password_hash"] },
      order: [["user_id", "ASC"]]
    });
  },

  create: async (data, options = {}) => {
    return await User.create(data, options);
  },

  update: async (userId, updateData) => {
    const user = await User.findByPk(userId);
    if (!user) return null;
    return await user.update(updateData);
  }
};
