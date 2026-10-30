import { MedicalRequest, Pdl, User, MedicalRecord } from "../models/index.js";

export const requestRepository = {
  create: async (data, options = {}) => {
    return await MedicalRequest.create(data, options);
  },

  findById: async (requestId) => {
    return await MedicalRequest.findByPk(requestId, {
      include: [
        {
          model: Pdl,
          as: "pdl",
          include: [{ model: MedicalRecord, as: "medicalRecord" }]
        },
        { model: User, as: "requester", attributes: ["user_id", "full_name", "badge_number"] }
      ]
    });
  },

  getAll: async (statusFilter = null) => {
    const where = statusFilter ? { request_status: statusFilter } : {};
    return await MedicalRequest.findAll({
      where,
      include: [
        {
          model: Pdl,
          as: "pdl",
          include: [{ model: MedicalRecord, as: "medicalRecord" }]
        },
        { model: User, as: "requester", attributes: ["user_id", "full_name", "badge_number"] }
      ],
      order: [
        ["priority", "DESC"], // Urgent first
        ["createdAt", "DESC"]
      ]
    });
  },

  updateStatus: async (requestId, status, options = {}) => {
    const request = await MedicalRequest.findByPk(requestId);
    if (!request) return null;
    request.request_status = status;
    await request.save(options);
    return request;
  }
};
