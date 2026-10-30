import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Medication = sequelize.define(
  "Medication",
  {
    medication_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    prescription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "prescriptions",
        key: "prescription_id"
      }
    },
    medication_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    dosage: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    instructions: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    tableName: "medications",
    timestamps: true,
    indexes: [
      {
        fields: ["prescription_id"]
      }
    ]
  }
);
