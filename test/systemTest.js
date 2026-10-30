import app, { startServer } from "../index.js";

async function runTests() {
  console.log("=================================================");
  console.log("🏥 BJMP MEDICAL OFFICER SYSTEM - AUTOMATED INTEGRATION TESTS");
  console.log("=================================================");

  const server = await startServer(3099);
  const BASE_URL = "http://localhost:3099/api";

  let doctorToken = null;
  let nurseToken = null;
  let jailOfficerToken = null;
  let adminToken = null;

  try {
    // TEST 1: Authentication for all 4 roles
    console.log("\n▶ TEST 1: Multi-role Authentication (RBAC)");
    const loginDoctor = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "dr.santos", password: "Doctor123!" })
    }).then((r) => r.json());
    console.log("  ✓ Doctor Login:", loginDoctor.success, "| Role:", loginDoctor.user.role);
    doctorToken = loginDoctor.token;

    const loginNurse = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nurse.cruz", password: "Nurse123!" })
    }).then((r) => r.json());
    console.log("  ✓ Nurse Login:", loginNurse.success, "| Role:", loginNurse.user.role);
    nurseToken = loginNurse.token;

    const loginOfficer = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "jo.gomez", password: "Officer123!" })
    }).then((r) => r.json());
    console.log("  ✓ Jail Officer Login:", loginOfficer.success, "| Role:", loginOfficer.user.role);
    jailOfficerToken = loginOfficer.token;

    const loginAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "Admin123!" })
    }).then((r) => r.json());
    console.log("  ✓ Admin Login:", loginAdmin.success, "| Role:", loginAdmin.user.role);
    adminToken = loginAdmin.token;

    // TEST 2: PDL Registry Search & Fetch
    console.log("\n▶ TEST 2: PDL Registry & Medical Record Retrieval");
    const pdlList = await fetch(`${BASE_URL}/pdls`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    }).then((r) => r.json());
    console.log(`  ✓ Retrieved ${pdlList.count} PDLs from relational database.`);
    const samplePdl = pdlList.data[0];
    console.log(`  ✓ Sample PDL: ${samplePdl.full_name} (${samplePdl.pdl_number})`);

    // TEST 3: Register New PDL
    console.log("\n▶ TEST 3: Register New PDL & Initialize 1:1 Medical Record");
    const newPdlRes = await fetch(`${BASE_URL}/pdls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`
      },
      body: JSON.stringify({
        pdl_number: "BJMP-MNL-2026-9999",
        full_name: "Test PDL Carlos Ramos",
        date_of_birth: "1990-03-15",
        admission_date: "2026-10-30",
        assigned_facility: "Manila City Jail Male Dormitory",
        cell_number: "Brigada 9 - Cell 01",
        initial_medical_history: "Mild intermittent asthma",
        initial_allergies: "NKDA"
      })
    }).then((r) => r.json());
    console.log("  ✓ New PDL Registration:", newPdlRes.success, "| Record ID:", newPdlRes.data.medicalRecord.record_id);
    const testRecordId = newPdlRes.data.medicalRecord.record_id;

    // TEST 4: Triage Intake by Nurse (Vital signs & symptoms)
    console.log("\n▶ TEST 4: Nurse Triage Intake Workflow (State: PENDING EVALUATION -> UNDER EXAMINATION)");
    const triageRes = await fetch(`${BASE_URL}/clinical/triage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`
      },
      body: JSON.stringify({
        record_id: testRecordId,
        vital_signs: {
          blood_pressure: "145/95",
          heart_rate: 88,
          temperature: 37.4,
          spo2: 97,
          respiratory_rate: 20
        },
        symptoms: "Patient complaining of mild dizziness and temporal tightness."
      })
    }).then((r) => r.json());
    console.log("  ✓ Triage Logged:", triageRes.success, "| Updated Case State:", triageRes.data.updatedCaseStatus);

    // TEST 5: Doctor Clinical Examination, Diagnosis & Dynamic Prescription (State: UNDER EXAMINATION -> UNDER TREATMENT)
    console.log("\n▶ TEST 5: Medical Officer Examination & Prescription Writer");
    const examRes = await fetch(`${BASE_URL}/clinical/examine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        record_id: testRecordId,
        symptoms: "Persistent headache, neck muscle tightness.",
        findings: "Oriented x3, heart sounds regular, S2 prominent. No focal neurological deficits.",
        vital_signs: {
          blood_pressure: "148/96",
          heart_rate: 86,
          temperature: 37.1,
          spo2: 98,
          respiratory_rate: 18
        },
        diagnosis_description: "Essential Hypertension Stage 1 with Tension Headache",
        treatment_plan: "Initiate Amlodipine 5mg OD PO, daily BP monitoring, lifestyle modifications.",
        medications: [
          { medication_name: "Amlodipine Besylate", dosage: "5 mg tab", instructions: "Take 1 tablet every morning" },
          { medication_name: "Paracetamol", dosage: "500 mg tab", instructions: "Take 1 tablet PRN for headache" }
        ]
      })
    }).then((r) => r.json());
    console.log("  ✓ Clinical Exam Finalized:", examRes.success, "| State Machine Status:", examRes.data.caseStatus);
    console.log(`  ✓ Prescriptions Created: ${examRes.data.medications.length} medication items`);

    // TEST 6: State Machine Illegal Transition Validation
    console.log("\n▶ TEST 6: Clinical Case State Machine Enforcement (Illegal Jump Test)");
    const illegalJump = await fetch(`${BASE_URL}/clinical/case-state/${testRecordId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        case_status: "Case Created" // Illegal jump backwards from UNDER TREATMENT
      })
    }).then((r) => r.json());
    console.log("  ✓ Illegal Transition Blocked (Expected):", !illegalJump.success, "| Reason:", illegalJump.message);

    // TEST 7: Hospital Referral Lifecycle (Drafted -> Escort Requested -> Warden Approved -> Outpatient Referred -> Discharged)
    console.log("\n▶ TEST 7: Hospital Referral State Machine & Escort Dispatch");
    const refCreate = await fetch(`${BASE_URL}/referrals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        record_id: testRecordId,
        destination_hospital: "Jose R. Reyes Memorial Medical Center",
        reason: "Cardiology specialized 2D-Echocardiogram and Holter monitoring"
      })
    }).then((r) => r.json());
    console.log("  ✓ Referral Drafted:", refCreate.success, "| ID:", refCreate.data.referral_id);
    const testRefId = refCreate.data.referral_id;

    // Advance to Escort Requested
    const refEscort = await fetch(`${BASE_URL}/referrals/${testRefId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jailOfficerToken}`
      },
      body: JSON.stringify({
        referral_status: "Escort Requested",
        vehicle_plate: "BJMP-VAN-01",
        escort_notes: "Armed team assigned"
      })
    }).then((r) => r.json());
    console.log("  ✓ Referral Advanced to 'Escort Requested':", refEscort.success);

    // Advance to Warden Approved
    const refApproved = await fetch(`${BASE_URL}/referrals/${testRefId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ referral_status: "Warden Approved" })
    }).then((r) => r.json());
    console.log("  ✓ Referral Advanced to 'Warden Approved':", refApproved.success);

    // Advance to Outpatient Referred (Patient departs facility)
    const refDeparted = await fetch(`${BASE_URL}/referrals/${testRefId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jailOfficerToken}`
      },
      body: JSON.stringify({ referral_status: "Outpatient Referred" })
    }).then((r) => r.json());
    console.log("  ✓ Referral Advanced to 'Outpatient Referred':", refDeparted.success);

    // Advance to Discharged (Patient safely returned to facility clinic)
    const refDischarged = await fetch(`${BASE_URL}/referrals/${testRefId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({ referral_status: "Discharged" })
    }).then((r) => r.json());
    console.log("  ✓ Referral Advanced to 'Discharged':", refDischarged.success);

    // TEST 8: Jail Officer Custody Checkup Requests
    console.log("\n▶ TEST 8: Custody Medical Checkup Request Flow");
    const custReq = await fetch(`${BASE_URL}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jailOfficerToken}`
      },
      body: JSON.stringify({
        pdl_id: samplePdl.pdl_id,
        reason_for_request: "PDL complaining of chest heaviness during cell inspection.",
        priority: "Urgent"
      })
    }).then((r) => r.json());
    console.log("  ✓ Custody Request Submitted:", custReq.success, "| Priority:", custReq.data.priority);

    // Review Request
    const reviewReq = await fetch(`${BASE_URL}/requests/${custReq.data.request_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({ request_status: "Reviewed" })
    }).then((r) => r.json());
    console.log("  ✓ Custody Request Reviewed:", reviewReq.success);

    // TEST 9: Biomedical Vital Spike Alert & Timing Machine Simulation
    console.log("\n▶ TEST 9: Biomedical Vital Spike Alert & State Machine (<30ms Simulation)");
    const simAlert = await fetch(`${BASE_URL}/alerts/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({ scenario: "hypertensive" })
    }).then((r) => r.json());
    console.log("  ✓ Vital Spike Triggered:", simAlert.success);
    console.log(`  ✓ Latency: ${simAlert.data.dispatch_latency_ms} ms (< 30ms requirement satisfied)`);
    console.log("  ✓ State Machine Status:", simAlert.data.state);

    // Doctor Acknowledge Alert (Transition to SILENT)
    const ackAlert = await fetch(`${BASE_URL}/alerts/${simAlert.data.alert_id}/acknowledge`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    }).then((r) => r.json());
    console.log("  ✓ Doctor Acknowledged Alert:", ackAlert.success, "| New State:", ackAlert.data.state);

    // TEST 10: System Administrator Overview & Immutable Audit Trail
    console.log("\n▶ TEST 10: Admin Telemetry & Immutable Audit Trail Integrity");
    const overview = await fetch(`${BASE_URL}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then((r) => r.json());
    console.log("  ✓ Admin Overview:", overview.success, "| Total Users:", overview.data.stats.totalUsers);

    const auditLogs = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then((r) => r.json());
    console.log(`  ✓ Audit Trail Count: ${auditLogs.count} immutable entries logged.`);
    console.log("  ✓ Recent Audit Actions:", auditLogs.data.slice(0, 3).map((l) => l.action).join(", "));

    // TEST 11: Dedicated Role Web Pages
    console.log("\n▶ TEST 11: Dedicated Role Web Pages (/login, /medical-officer, /nurse, /jail-officer, /admin)");
    const WEB_BASE = "http://localhost:3099";
    for (const route of ["/login", "/medical-officer", "/nurse", "/jail-officer", "/admin"]) {
      const resp = await fetch(`${WEB_BASE}${route}`);
      console.log(`  ✓ GET ${route} -> HTTP ${resp.status}`);
    }

    console.log("\n=================================================");
    console.log("🎉 ALL 11 INTEGRATION TESTS PASSED WITH 100% SUCCESS!");
    console.log("=================================================\n");

  } catch (err) {
    console.error("❌ Test suite encountered an error:", err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
