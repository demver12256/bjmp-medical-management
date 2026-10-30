import { AuditLog } from "../models/index.js";

export const writeAuditLog = async ({ userId = null, action, module, details, ipAddress = "127.0.0.1" }) => {
  try {
    return await AuditLog.create({
      user_id: userId,
      action,
      module,
      details: typeof details === "object" ? JSON.stringify(details) : String(details || ""),
      ip_address: ipAddress,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Failed to write immutable audit log:", error);
  }
};

export const auditTrailLogger = (action, moduleName, detailsGetter = null) => {
  return async (req, res, next) => {
    // Intercept finish to record status
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const userId = req.user ? req.user.user_id : null;
          const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
          let details = "";

          if (typeof detailsGetter === "function") {
            details = detailsGetter(req, res);
          } else {
            details = `Method: ${req.method} | URL: ${req.originalUrl} | Status: ${res.statusCode}`;
          }

          await writeAuditLog({
            userId,
            action,
            module: moduleName,
            details,
            ipAddress: String(ip)
          });
        } catch (err) {
          console.error("❌ AuditTrailWriter middleware error:", err);
        }
      }
    });

    next();
  };
};
