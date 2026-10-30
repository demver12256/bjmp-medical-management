import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const MedicalExamination = sequelize.define(
  "MedicalExamination",
  {
    examination_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "medical_records",
        key: "record_id"
      }
    },
    examination_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    findings: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    vital_signs: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    conducted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    }
  },
  {
    tableName: "medical_examinations",
    timestamps: true,
    indexes: [
      {
        fields: ["record_id"]
      },
      {
        fields: ["examination_date"]
      }
    ]
  }
);
