import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import cors from "cors";
import router from "./routes/index.js";
import apiRouter from "./routes/api.js";
import fs from "fs";
import hbs from "hbs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "bjmp-secret-key-2026",
    resave: false,
    saveUninitialized: false
  })
);
app.use(flash());

app.engine("xian", async (filePath, options, callback) => {
  try {
    registerAllPartials();
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, "views");

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");

const partialsDir = path.join(__dirname, "views/partials");
const registerAllPartials = () => {
  try {
    if (!fs.existsSync(partialsDir)) return;
    const files = fs.readdirSync(partialsDir);
    files
      .filter((file) => file.endsWith(".xian"))
      .forEach((file) => {
        const partialName = file.replace(".xian", "");
        const fullPath = path.join(partialsDir, file);
        const content = fs.readFileSync(fullPath, "utf8");
        hbs.registerPartial(partialName, content);
      });
  } catch (err) {
    console.error("❌ Could not read partials directory:", err);
  }
};
registerAllPartials();

// REST API Tier (Layered Architecture: Controller -> Service -> Repository -> ORM)
app.use("/api", apiRouter);

// Frontend Web Views
app.use("/", router);

export default app;

export const startServer = (port = PORT) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`🏥 BJMP Medical Officer Management System running at http://localhost:${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun && !process.env.XIAN_ELECTRON) {
  startServer();
}
