import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Role = sequelize.define(
  "Role",
  {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.ENUM("MedicalOfficer", "Nurse", "JailOfficer", "SystemAdministrator"),
      allowNull: false,
      unique: true
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    }
  },
  {
    tableName: "roles",
    timestamps: true
  }
);
