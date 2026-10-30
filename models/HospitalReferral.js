import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const HospitalReferral = sequelize.define(
  "HospitalReferral",
  {
    referral_id: {
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
    referral_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    destination_hospital: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    referral_status: {
      type: DataTypes.ENUM(
        "Drafted",
        "Escort Requested",
        "Warden Approved",
        "Outpatient Referred",
        "Discharged"
      ),
      allowNull: false,
      defaultValue: "Drafted"
    },
    authorized_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id"
      }
    },
    escort_officer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id"
      }
    },
    vehicle_plate: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    escort_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discharged_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "hospital_referrals",
    timestamps: true,
    indexes: [
      {
        fields: ["record_id"]
      },
      {
        fields: ["referral_status"]
      },
      {
        fields: ["escort_officer_id"]
      }
    ]
  }
);
