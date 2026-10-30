const ROLE_PATHS = {
  MedicalOfficer: "/medical-officer",
  Nurse: "/nurse",
  JailOfficer: "/jail-officer",
  SystemAdministrator: "/admin"
};

export const homePage = (req, res) => {
  if (req.session && req.session.role && ROLE_PATHS[req.session.role]) {
    return res.redirect(ROLE_PATHS[req.session.role]);
  }
  return res.redirect("/login");
};

export const loginPage = (req, res) => {
  if (req.session && req.session.role && ROLE_PATHS[req.session.role]) {
    return res.redirect(ROLE_PATHS[req.session.role]);
  }
  res.render("login", {
    title: "Sign In • BJMP Medical Officer System",
    pageRole: "Login"
  });
};

export const medicalOfficerPage = (req, res) => {
  res.render("medical-officer", {
    title: "Medical Officer Workbench",
    pageRole: "MedicalOfficer",
    portalTitle: "Medical Officer Clinical Workbench",
    portalBadge: "MEDICAL OFFICER PORTAL",
    portalBadgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40"
  });
};

export const nursePage = (req, res) => {
  res.render("nurse", {
    title: "Nurse Triage & Care Station",
    pageRole: "Nurse",
    portalTitle: "Nurse Triage & Pharmacy Station",
    portalBadge: "NURSE STATION PORTAL",
    portalBadgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  });
};

export const jailOfficerPage = (req, res) => {
  res.render("jail-officer", {
    title: "Jail Officer Escort & Custody Portal",
    pageRole: "JailOfficer",
    portalTitle: "Jail Escort & Custody Request Portal",
    portalBadge: "JAIL OFFICER PORTAL",
    portalBadgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  });
};

export const adminPage = (req, res) => {
  res.render("admin", {
    title: "System Administrator & Audit Command",
    pageRole: "SystemAdministrator",
    portalTitle: "System Administration & Audit Command",
    portalBadge: "SYSTEM ADMIN PORTAL",
    portalBadgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40"
  });
};
