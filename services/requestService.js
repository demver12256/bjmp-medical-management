import { requestRepository } from "../repositories/requestRepository.js";
import { pdlRepository } from "../repositories/pdlRepository.js";
import { writeAuditLog } from "../middleware/auditTrailWriter.js";

export const requestService = {
  submitCheckupRequest: async ({ pdlId, submittedByUserId, reason, priority = "Normal", ipAddress = "127.0.0.1" }) => {
    const pdl = await pdlRepository.findById(pdlId, false);
    if (!pdl) {
      throw new Error(`PDL #${pdlId} not found.`);
    }

    const request = await requestRepository.create({
      pdl_id: pdlId,
      submitted_by: submittedByUserId,
      reason_for_request: reason,
      priority,
      request_status: "Pending"
    });

    await writeAuditLog({
      userId: submittedByUserId,
      action: "MEDICAL_REQUEST_SUBMITTED",
      module: "Custody Checkup Requests",
      details: `Jail Officer submitted [${priority}] checkup request for PDL: ${pdl.full_name} (${pdl.pdl_number}). Reason: ${reason}`,
      ipAddress
    });

    return request;
  },

  getAllRequests: async (statusFilter = null) => {
    return await requestRepository.getAll(statusFilter);
  },

  updateRequestStatus: async (requestId, status, reviewerUserId, ipAddress = "127.0.0.1") => {
    const updated = await requestRepository.updateStatus(requestId, status);
    if (!updated) {
      throw new Error(`Request #${requestId} not found.`);
    }

    await writeAuditLog({
      userId: reviewerUserId,
      action: "MEDICAL_REQUEST_REVIEWED",
      module: "Custody Checkup Requests",
      details: `Medical Checkup Request #${requestId} updated to status: "${status}"`,
      ipAddress
    });

    return updated;
  }
};
