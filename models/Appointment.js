import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Appointment = sequelize.define(
  "Appointment",
  {
    appointment_id: {
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
    appointment_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    purpose: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    appointment_status: {
      type: DataTypes.ENUM("Scheduled", "Attended", "Cancelled"),
      allowNull: false,
      defaultValue: "Scheduled"
    }
  },
  {
    tableName: "appointments",
    timestamps: true,
    indexes: [
      {
        fields: ["record_id"]
      },
      {
        fields: ["appointment_status"]
      }
    ]
  }
);
