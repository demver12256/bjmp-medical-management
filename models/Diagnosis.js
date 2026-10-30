import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Diagnosis = sequelize.define(
  "Diagnosis",
  {
    diagnosis_id: {
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
    diagnosis_description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    diagnosis_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    }
  },
  {
    tableName: "diagnoses",
    timestamps: true,
    indexes: [
      {
        fields: ["record_id"]
      }
    ]
  }
);
