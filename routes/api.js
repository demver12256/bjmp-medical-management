import express from "express";
import { authController } from "../controllers/authController.js";
import { pdlController } from "../controllers/pdlController.js";
import { clinicalController } from "../controllers/clinicalController.js";
import { referralController } from "../controllers/referralController.js";
import { requestController } from "../controllers/requestController.js";
import { adminController } from "../controllers/adminController.js";
import { alertController } from "../controllers/alertController.js";

import { authFilter, requireRoles } from "../middleware/authFilter.js";
import { DataValidationEngine } from "../middleware/validationEngine.js";

const apiRouter = express.Router();

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================
apiRouter.post("/auth/login", authController.login);
apiRouter.get("/auth/me", authFilter, authController.getCurrentUser);
apiRouter.post("/auth/logout", authController.logout);

// ==========================================
// 2. PDL REGISTRY & PROFILE
// ==========================================
apiRouter.get("/pdls", authFilter, pdlController.searchPdls);
apiRouter.post(
  "/pdls",
  authFilter,
  requireRoles(["Nurse", "MedicalOfficer", "SystemAdministrator"]),
  DataValidationEngine.validatePdlRegistration,
  pdlController.registerPdl
);
apiRouter.get("/pdls/:id", authFilter, pdlController.getPdlById);
apiRouter.get("/pdls/:id/profile", authFilter, pdlController.getFullHealthcareProfile);

// ==========================================
// 3. CLINICAL WORKFLOW & STATE MACHINE
// ==========================================
// Step 1: Nurse Triage Intake
apiRouter.post(
  "/clinical/triage",
  authFilter,
  requireRoles(["Nurse", "MedicalOfficer"]),
  DataValidationEngine.validateTriageVitals,
  clinicalController.logTriage
);

// Step 2 & 3: Medical Officer Full Exam, Diagnosis, Treatment/Prescription or Referral
apiRouter.post(
  "/clinical/examine",
  authFilter,
  requireRoles(["MedicalOfficer"]),
  DataValidationEngine.validateDiagnosisAndPrescription,
  clinicalController.conductExamination
);

// Clinical Case State Machine Transitions
apiRouter.patch(
  "/clinical/case-state/:recordId",
  authFilter,
  requireRoles(["MedicalOfficer", "SystemAdministrator"]),
  clinicalController.updateCaseState
);

// Recovery Observations (Nurse & Doctor)
apiRouter.post(
  "/clinical/observation",
  authFilter,
  requireRoles(["Nurse", "MedicalOfficer"]),
  clinicalController.logObservation
);

// Prescriptions
apiRouter.get("/clinical/prescriptions", authFilter, clinicalController.getPrescriptions);
apiRouter.patch(
  "/clinical/prescriptions/:id/dispense",
  authFilter,
  requireRoles(["Nurse", "MedicalOfficer", "SystemAdministrator"]),
  clinicalController.dispensePrescription
);

// ==========================================
// 4. HOSPITAL REFERRALS & ESCORT DISPATCH
// ==========================================
apiRouter.get("/referrals", authFilter, referralController.getReferrals);
apiRouter.get("/referrals/:id", authFilter, referralController.getReferralById);
apiRouter.post(
  "/referrals",
  authFilter,
  requireRoles(["MedicalOfficer"]),
  referralController.createReferral
);
apiRouter.patch(
  "/referrals/:id",
  authFilter,
  requireRoles(["MedicalOfficer", "JailOfficer", "SystemAdministrator"]),
  DataValidationEngine.validateHospitalReferralUpdate,
  referralController.updateReferral
);

// ==========================================
// 5. CUSTODY MEDICAL CHECKUP REQUESTS
// ==========================================
apiRouter.get("/requests", authFilter, requestController.getRequests);
apiRouter.post(
  "/requests",
  authFilter,
  requireRoles(["JailOfficer", "SystemAdministrator"]),
  DataValidationEngine.validateMedicalRequest,
  requestController.submitRequest
);
apiRouter.patch(
  "/requests/:id",
  authFilter,
  requireRoles(["MedicalOfficer", "Nurse", "JailOfficer", "SystemAdministrator"]),
  requestController.updateRequestStatus
);

// ==========================================
// 6. SYSTEM ADMINISTRATION & AUDIT TRAIL
// ==========================================
apiRouter.get(
  "/admin/overview",
  authFilter,
  requireRoles(["SystemAdministrator"]),
  adminController.getSystemOverview
);
apiRouter.get(
  "/admin/users",
  authFilter,
  requireRoles(["SystemAdministrator", "JailOfficer"]),
  adminController.getUsers
);
apiRouter.post(
  "/admin/users",
  authFilter,
  requireRoles(["SystemAdministrator"]),
  adminController.createUser
);
apiRouter.patch(
  "/admin/users/:id/status",
  authFilter,
  requireRoles(["SystemAdministrator"]),
  adminController.updateUserStatus
);
apiRouter.get(
  "/admin/audit-logs",
  authFilter,
  requireRoles(["SystemAdministrator"]),
  adminController.getAuditLogs
);

// ==========================================
// 7. BIOMEDICAL VITAL SPIKE ALERTS
// ==========================================
apiRouter.get("/alerts", authFilter, alertController.getActiveAlerts);
apiRouter.get("/alerts/history", authFilter, alertController.getAllHistory);
apiRouter.post(
  "/alerts/:id/acknowledge",
  authFilter,
  requireRoles(["MedicalOfficer", "Nurse", "JailOfficer", "SystemAdministrator"]),
  alertController.acknowledgeAlert
);
apiRouter.post(
  "/alerts/simulate",
  authFilter,
  alertController.simulateSpike
);

export default apiRouter;
