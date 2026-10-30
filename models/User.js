import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "roles",
        key: "role_id"
      }
    },
    account_status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active"
    },
    license_number: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    specialization: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    personnel_id: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    badge_number: {
      type: DataTypes.STRING(80),
      allowNull: true
    }
  },
  {
    tableName: "users",
    timestamps: true
  }
);
