export const DataValidationEngine = {
  validatePdlRegistration: (req, res, next) => {
    const { pdl_number, full_name, date_of_birth, admission_date, assigned_facility, cell_number } = req.body;
    const errors = [];

    if (!pdl_number || typeof pdl_number !== "string" || !pdl_number.trim()) {
      errors.push("pdl_number is required and must be a valid identifier.");
    }
    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 3) {
      errors.push("full_name is required and must be at least 3 characters.");
    }
    if (!date_of_birth || isNaN(Date.parse(date_of_birth))) {
      errors.push("date_of_birth must be a valid date format (YYYY-MM-DD).");
    }
    if (!admission_date || isNaN(Date.parse(admission_date))) {
      errors.push("admission_date must be a valid date format (YYYY-MM-DD).");
    }
    if (!assigned_facility || typeof assigned_facility !== "string" || !assigned_facility.trim()) {
      errors.push("assigned_facility is required.");
    }
    if (!cell_number || typeof cell_number !== "string" || !cell_number.trim()) {
      errors.push("cell_number is required.");
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Data validation failed for PDL registration.",
        errors
      });
    }
    next();
  },

  validateTriageVitals: (req, res, next) => {
    const { vital_signs, symptoms } = req.body;
    const errors = [];

    if (!vital_signs || typeof vital_signs !== "object") {
      errors.push("vital_signs object is required.");
    } else {
      const { blood_pressure, heart_rate, temperature, spo2, respiratory_rate } = vital_signs;

      if (!blood_pressure || !/^\d{2,3}\/\d{2,3}$/.test(String(blood_pressure).trim())) {
        errors.push("vital_signs.blood_pressure must be formatted as 'Systolic/Diastolic' (e.g. 120/80).");
      }
      const hr = Number(heart_rate);
      if (isNaN(hr) || hr < 30 || hr > 250) {
        errors.push("vital_signs.heart_rate must be a number between 30 and 250 bpm.");
      }
      const temp = Number(temperature);
      if (isNaN(temp) || temp < 30 || temp > 45) {
        errors.push("vital_signs.temperature must be a number between 30°C and 45°C.");
      }
      const o2 = Number(spo2);
      if (isNaN(o2) || o2 < 50 || o2 > 100) {
        errors.push("vital_signs.spo2 must be a percentage between 50% and 100%.");
      }
      if (respiratory_rate !== undefined) {
        const rr = Number(respiratory_rate);
        if (isNaN(rr) || rr < 5 || rr > 70) {
          errors.push("vital_signs.respiratory_rate must be between 5 and 70 breaths/min.");
        }
      }
    }

    if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
      errors.push("symptoms description is required for triage intake.");
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Biomedical data validation failed.",
        errors
      });
    }
    next();
  },

  validateExamination: (req, res, next) => {
    const { symptoms, findings, vital_signs } = req.body;
    const errors = [];

    if (!findings || typeof findings !== "string" || !findings.trim()) {
      errors.push("Clinical examination findings are required.");
    }
    if (vital_signs) {
      if (vital_signs.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(String(vital_signs.blood_pressure).trim())) {
        errors.push("vital_signs.blood_pressure format invalid (e.g. 120/80).");
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Examination validation failed.",
        errors
      });
    }
    next();
  },

  validateDiagnosisAndPrescription: (req, res, next) => {
    const { diagnosis_description, treatment_plan, medications, referral } = req.body;
    const errors = [];

    if (!diagnosis_description || typeof diagnosis_description !== "string" || !diagnosis_description.trim()) {
      errors.push("diagnosis_description is required.");
    }

    if (medications && Array.isArray(medications) && medications.length > 0) {
      medications.forEach((med, idx) => {
        if (!med.medication_name || !med.dosage || !med.instructions) {
          errors.push(`Medication #${idx + 1} must include name, dosage, and instructions.`);
        }
      });
    }

    if (referral) {
      if (!referral.destination_hospital || !referral.destination_hospital.trim()) {
        errors.push("Hospital referral requires destination_hospital.");
      }
      if (!referral.reason || !referral.reason.trim()) {
        errors.push("Hospital referral requires reason for transfer.");
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Clinical decision validation failed.",
        errors
      });
    }
    next();
  },

  validateMedicalRequest: (req, res, next) => {
    const { pdl_id, reason_for_request, priority } = req.body;
    const errors = [];

    if (!pdl_id) errors.push("pdl_id is required.");
    if (!reason_for_request || !reason_for_request.trim()) errors.push("reason_for_request is required.");
    if (priority && !["Normal", "Urgent"].includes(priority)) {
      errors.push("priority must be 'Normal' or 'Urgent'.");
    }

    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: "Medical request validation failed.",
        errors
      });
    }
    next();
  },

  validateHospitalReferralUpdate: (req, res, next) => {
    const { referral_status } = req.body;
    const allowed = ["Drafted", "Escort Requested", "Warden Approved", "Outpatient Referred", "Discharged"];

    if (referral_status && !allowed.includes(referral_status)) {
      return res.status(422).json({
        success: false,
        message: `Invalid referral_status. Allowed values: ${allowed.join(", ")}`
      });
    }
    next();
  }
};
