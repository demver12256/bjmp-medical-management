import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Prescription = sequelize.define(
  "Prescription",
  {
    prescription_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    treatment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "treatments",
        key: "treatment_id"
      }
    },
    prescription_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dosage_instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    prescription_status: {
      type: DataTypes.ENUM("Pending", "Dispensed", "Cancelled"),
      allowNull: false,
      defaultValue: "Pending"
    },
    authorized_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    }
  },
  {
    tableName: "prescriptions",
    timestamps: true,
    indexes: [
      {
        fields: ["treatment_id"]
      },
      {
        fields: ["prescription_status"]
      }
    ]
  }
);
