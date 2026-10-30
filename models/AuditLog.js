import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const AuditLog = sequelize.define(
  "AuditLog",
  {
    log_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id"
      }
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    module: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: "audit_logs",
    timestamps: false,
    indexes: [
      {
        fields: ["user_id"]
      },
      {
        fields: ["module"]
      },
      {
        fields: ["action"]
      },
      {
        fields: ["timestamp"]
      }
    ]
  }
);
