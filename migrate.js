import mysql from "mysql2/promise";
import { sequelize } from "./models/index.js";
import { runSeed } from "./seeders/seed.js";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "12345";
const dbName = process.env.DB_NAME || "BJMP";

async function runMigration() {
  console.log("==================================================");
  console.log("🚀 MIGRATING TO MYSQL DATABASE: " + dbName);
  console.log(`📡 Host: ${dbHost}:${dbPort} | User: ${dbUser}`);
  console.log("==================================================");

  try {
    // 1. Connect to MySQL server to ensure database exists
    const rootConn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    console.log("✅ Authenticated with MySQL server!");
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`✅ Database \`${dbName}\` created or verified in MySQL / phpMyAdmin!`);
    await rootConn.end();

    // 2. Connect via Sequelize and synchronize all tables with foreign keys & cascades
    await sequelize.authenticate();
    console.log(`✅ Sequelize connected to MySQL database: ${dbName}`);

    console.log("🔄 Syncing schema, creating tables & foreign key constraints...");
    await sequelize.sync({ force: true });
    console.log("✅ All relational tables created successfully in MySQL!");

    // 3. Seed initial roles, officer accounts, sample PDLs, medical records, and audit logs
    console.log("🌱 Seeding realistic BJMP records into MySQL...");
    await runSeed();
    console.log("==================================================");
    console.log("🎉 MYSQL MIGRATION & SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    if (err.parent) console.error("Details:", err.parent.message);
    process.exit(1);
  }
}

runMigration();
