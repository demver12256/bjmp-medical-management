import { Sequelize } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dialect = process.env.DB_DIALECT || "mysql";

let sequelize;

if (dialect === "mysql") {
  sequelize = new Sequelize(
    process.env.DB_NAME || "BJMP",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "12345",
    {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      dialect: "mysql",
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // SQLite fallback
  const sqliteStorage = process.env.DB_STORAGE || path.resolve(__dirname, "../database/bjmp.sqlite");
  
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: sqliteStorage,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    }
  });

  sequelize.addHook("afterConnect", async (connection) => {
    return new Promise((resolve, reject) => {
      connection.run("PRAGMA foreign_keys = ON;", (err) => {
        if (err) return reject(err);
        connection.run("PRAGMA journal_mode = WAL;", (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  });
}

export { sequelize };
