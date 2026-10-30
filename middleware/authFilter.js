import { verifyToken } from "../config/jwt.js";
import { User, Role } from "../models/index.js";

export const authFilter = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.session && req.session.token) {
      token = req.session.token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: Missing access token."
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.user_id, {
      include: [{ model: Role, as: "role" }],
      attributes: { exclude: ["password_hash"] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: User account no longer exists."
      });
    }

    if (user.account_status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User account is inactive or suspended."
      });
    }

    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role ? user.role.role_name : null,
      permissions: user.role && user.role.permissions ? user.role.permissions : [],
      license_number: user.license_number,
      specialization: user.specialization,
      personnel_id: user.personnel_id,
      badge_number: user.badge_number
    };

    res.locals.currentUser = req.user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed: Invalid or expired token.",
      error: error.message
    });
  }
};

export const requireRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role_name}`
      });
    }

    next();
  };
};

export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const hasWildcard = req.user.permissions.includes("*");
    const hasPerm = req.user.permissions.includes(permissionKey);

    if (!hasWildcard && !hasPerm) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission [${permissionKey}].`
      });
    }

    next();
  };
};
