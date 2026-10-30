import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const Pdl = sequelize.define(
  "Pdl",
  {
    pdl_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pdl_number: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    admission_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    assigned_facility: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    cell_number: {
      type: DataTypes.STRING(80),
      allowNull: false
    }
  },
  {
    tableName: "pdls",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["pdl_number"]
      },
      {
        fields: ["full_name"]
      }
    ]
  }
);
