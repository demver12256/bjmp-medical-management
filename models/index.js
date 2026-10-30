import { sequelize } from "../config/database.js";
import { Role } from "./Role.js";
import { User } from "./User.js";
import { Pdl } from "./Pdl.js";
import { MedicalRecord } from "./MedicalRecord.js";
import { MedicalExamination } from "./MedicalExamination.js";
import { Diagnosis } from "./Diagnosis.js";
import { Treatment } from "./Treatment.js";
import { Prescription } from "./Prescription.js";
import { Medication } from "./Medication.js";
import { MedicalRequest } from "./MedicalRequest.js";
import { Appointment } from "./Appointment.js";
import { HospitalReferral } from "./HospitalReferral.js";
import { AuditLog } from "./AuditLog.js";

// Role <-> User
Role.hasMany(User, { foreignKey: "role_id", as: "users" });
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

// Pdl <-> MedicalRecord (1:1 with Cascade)
Pdl.hasOne(MedicalRecord, { foreignKey: "pdl_id", as: "medicalRecord", onDelete: "CASCADE" });
MedicalRecord.belongsTo(Pdl, { foreignKey: "pdl_id", as: "pdl" });

// User (Recorder) <-> MedicalRecord
User.hasMany(MedicalRecord, { foreignKey: "recorded_by", as: "recordedRecords" });
MedicalRecord.belongsTo(User, { foreignKey: "recorded_by", as: "recorder" });

// MedicalRecord <-> MedicalExamination (1:N with Cascade)
MedicalRecord.hasMany(MedicalExamination, { foreignKey: "record_id", as: "examinations", onDelete: "CASCADE" });
MedicalExamination.belongsTo(MedicalRecord, { foreignKey: "record_id", as: "medicalRecord" });

// User (Examiner) <-> MedicalExamination
User.hasMany(MedicalExamination, { foreignKey: "conducted_by", as: "conductedExaminations" });
MedicalExamination.belongsTo(User, { foreignKey: "conducted_by", as: "examiner" });

// MedicalRecord <-> Diagnosis (1:N with Cascade)
MedicalRecord.hasMany(Diagnosis, { foreignKey: "record_id", as: "diagnoses", onDelete: "CASCADE" });
Diagnosis.belongsTo(MedicalRecord, { foreignKey: "record_id", as: "medicalRecord" });

// User (Doctor) <-> Diagnosis
User.hasMany(Diagnosis, { foreignKey: "created_by", as: "createdDiagnoses" });
Diagnosis.belongsTo(User, { foreignKey: "created_by", as: "doctor" });

// Diagnosis <-> Treatment (1:N with Cascade)
Diagnosis.hasMany(Treatment, { foreignKey: "diagnosis_id", as: "treatments", onDelete: "CASCADE" });
Treatment.belongsTo(Diagnosis, { foreignKey: "diagnosis_id", as: "diagnosis" });

// Treatment <-> Prescription (1:N with Cascade)
Treatment.hasMany(Prescription, { foreignKey: "treatment_id", as: "prescriptions", onDelete: "CASCADE" });
Prescription.belongsTo(Treatment, { foreignKey: "treatment_id", as: "treatment" });

// User (Doctor) <-> Prescription
User.hasMany(Prescription, { foreignKey: "authorized_by", as: "authorizedPrescriptions" });
Prescription.belongsTo(User, { foreignKey: "authorized_by", as: "authorizer" });

// Prescription <-> Medication (1:N with Cascade)
Prescription.hasMany(Medication, { foreignKey: "prescription_id", as: "medications", onDelete: "CASCADE" });
Medication.belongsTo(Prescription, { foreignKey: "prescription_id", as: "prescription" });

// Pdl <-> MedicalRequest (1:N with Cascade)
Pdl.hasMany(MedicalRequest, { foreignKey: "pdl_id", as: "medicalRequests", onDelete: "CASCADE" });
MedicalRequest.belongsTo(Pdl, { foreignKey: "pdl_id", as: "pdl" });

// User (Jail Officer) <-> MedicalRequest
User.hasMany(MedicalRequest, { foreignKey: "submitted_by", as: "submittedRequests" });
MedicalRequest.belongsTo(User, { foreignKey: "submitted_by", as: "requester" });

// MedicalRecord <-> Appointment (1:N with Cascade)
MedicalRecord.hasMany(Appointment, { foreignKey: "record_id", as: "appointments", onDelete: "CASCADE" });
Appointment.belongsTo(MedicalRecord, { foreignKey: "record_id", as: "medicalRecord" });

// MedicalRecord <-> HospitalReferral (1:N with Cascade)
MedicalRecord.hasMany(HospitalReferral, { foreignKey: "record_id", as: "hospitalReferrals", onDelete: "CASCADE" });
HospitalReferral.belongsTo(MedicalRecord, { foreignKey: "record_id", as: "medicalRecord" });

// User (Doctor) <-> HospitalReferral
User.hasMany(HospitalReferral, { foreignKey: "authorized_by", as: "authorizedReferrals" });
HospitalReferral.belongsTo(User, { foreignKey: "authorized_by", as: "authorizer" });

// User (Escort Officer) <-> HospitalReferral
User.hasMany(HospitalReferral, { foreignKey: "escort_officer_id", as: "escortedReferrals" });
HospitalReferral.belongsTo(User, { foreignKey: "escort_officer_id", as: "escortOfficer" });

// User <-> AuditLog
User.hasMany(AuditLog, { foreignKey: "user_id", as: "auditLogs" });
AuditLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

export {
  sequelize,
  Role,
  User,
  Pdl,
  MedicalRecord,
  MedicalExamination,
  Diagnosis,
  Treatment,
  Prescription,
  Medication,
  MedicalRequest,
  Appointment,
  HospitalReferral,
  AuditLog
};
