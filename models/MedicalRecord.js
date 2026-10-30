import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const MedicalRecord = sequelize.define(
  "MedicalRecord",
  {
    record_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pdl_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "pdls",
        key: "pdl_id"
      }
    },
    recorded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    },
    record_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    medical_history: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    case_status: {
      type: DataTypes.ENUM(
        "Case Created",
        "PENDING EVALUATION",
        "UNDER EXAMINATION",
        "UNDER TREATMENT",
        "REFERRAL PENDING",
        "OUTPATIENT REFERRAL",
        "RECOVERY & OBSERVATION",
        "RESOLVED (CLOSED)"
      ),
      allowNull: false,
      defaultValue: "PENDING EVALUATION"
    }
  },
  {
    tableName: "medical_records",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["pdl_id"]
      },
      {
        fields: ["case_status"]
      }
    ]
  }
);
