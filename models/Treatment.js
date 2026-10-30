import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Treatment = sequelize.define(
  "Treatment",
  {
    treatment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    diagnosis_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "diagnoses",
        key: "diagnosis_id"
      }
    },
    treatment_plan: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    treatment_status: {
      type: DataTypes.ENUM("Active", "Completed", "Discontinued"),
      allowNull: false,
      defaultValue: "Active"
    }
  },
  {
    tableName: "treatments",
    timestamps: true,
    indexes: [
      {
        fields: ["diagnosis_id"]
      },
      {
        fields: ["treatment_status"]
      }
    ]
  }
);
