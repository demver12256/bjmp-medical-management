import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const MedicalRequest = sequelize.define(
  "MedicalRequest",
  {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pdl_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "pdls",
        key: "pdl_id"
      }
    },
    submitted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    },
    reason_for_request: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM("Normal", "Urgent"),
      allowNull: false,
      defaultValue: "Normal"
    },
    request_status: {
      type: DataTypes.ENUM("Pending", "Reviewed", "Cancelled"),
      allowNull: false,
      defaultValue: "Pending"
    }
  },
  {
    tableName: "medical_requests",
    timestamps: true,
    indexes: [
      {
        fields: ["pdl_id"]
      },
      {
        fields: ["request_status"]
      },
      {
        fields: ["priority"]
      }
    ]
  }
);
