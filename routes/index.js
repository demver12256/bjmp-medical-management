import express from "express";
import {
  homePage,
  loginPage,
  medicalOfficerPage,
  nursePage,
  jailOfficerPage,
  adminPage
} from "../controllers/homeController.js";

const router = express.Router();

// Root & Authentication Entrypoints
router.get("/", homePage);
router.get("/login", loginPage);
router.get("/dashboard", homePage);

// Dedicated Role Pages
router.get("/medical-officer", medicalOfficerPage);
router.get("/doctor", (req, res) => res.redirect("/medical-officer"));

router.get("/nurse", nursePage);

router.get("/jail-officer", jailOfficerPage);
router.get("/officer", (req, res) => res.redirect("/jail-officer"));

router.get("/admin", adminPage);

router.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.redirect("/login");
});

export default router;
