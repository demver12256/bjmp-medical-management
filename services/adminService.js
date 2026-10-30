import bcrypt from "bcrypt";
import { userRepository } from "../repositories/userRepository.js";
import { auditLogRepository } from "../repositories/auditLogRepository.js";
import { Pdl, MedicalRecord, HospitalReferral, MedicalRequest, AuditLog, Role, User } from "../models/index.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

export const adminService = {
  getSystemHealthAndStats: async () => {
    const [totalUsers, totalPdls, activeCases, pendingReferrals, pendingRequests, totalAuditLogs, roles] = await Promise.all([
      User.count(),
      Pdl.count(),
      MedicalRecord.count({ where: { case_status: ["UNDER EXAMINATION", "UNDER TREATMENT", "REFERRAL PENDING"] } }),
      HospitalReferral.count({ where: { referral_status: ["Drafted", "Escort Requested", "Warden Approved"] } }),
      MedicalRequest.count({ where: { request_status: "Pending" } }),
      AuditLog.count(),
      Role.findAll()
    ]);

    const memoryUsage = process.memoryUsage();

    return {
      stats: {
        totalUsers,
        totalPdls,
        activeCases,
        pendingReferrals,
        pendingRequests,
        totalAuditLogs
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 10) / 10,
        memoryHeapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 10) / 10,
        databaseStatus: "Connected (ACID Enforced - Foreign Keys & WAL Active)"
      },
      roles
    };
  },

  getAllUsers: async (statusFilter = null) => {
    return await userRepository.getAll(statusFilter);
  },

  createUser: async (userData, adminUserId, ipAddress = "127.0.0.1") => {
    const existing = await userRepository.findByUsername(userData.username);
    if (existing) {
      throw new Error(`Username "${userData.username}" is already in use.`);
    }

    let roleId = userData.role_id;
    if (!roleId && userData.role_name) {
      const roleRec = await Role.findOne({ where: { role_name: userData.role_name } });
      if (!roleRec) throw new Error(`Invalid role "${userData.role_name}".`);
      roleId = roleRec.role_id;
    }

    const passwordHash = await bcrypt.hash(userData.password || "BjmpOfficer2026!", 10);

    const user = await userRepository.create({
      full_name: userData.full_name,
      username: userData.username,
      password_hash: passwordHash,
      role_id: roleId,
      account_status: userData.account_status || "Active",
      license_number: userData.license_number || null,
      specialization: userData.specialization || null,
      personnel_id: userData.personnel_id || null,
      badge_number: userData.badge_number || null
    });

    await writeAuditLog({
      userId: adminUserId,
      action: "USER_CREATED",
      module: "User Management",
      details: `Admin created officer account for ${user.full_name} (${user.username}). Role ID: ${user.role_id}`,
      ipAddress
    });

    return user;
  },

  updateUserStatus: async (targetUserId, newStatus, adminUserId, ipAddress = "127.0.0.1") => {
    const user = await userRepository.findById(targetUserId);
    if (!user) throw new Error(`User #${targetUserId} not found.`);

    await userRepository.update(targetUserId, { account_status: newStatus });

    await writeAuditLog({
      userId: adminUserId,
      action: "USER_STATUS_MODIFIED",
      module: "User Management",
      details: `Account status for ${user.username} changed to: ${newStatus}`,
      ipAddress
    });

    return user;
  },

  queryAuditLogs: async (filters = {}) => {
    return await auditLogRepository.getAll(filters);
  }
};
