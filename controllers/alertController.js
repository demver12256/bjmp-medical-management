import { vitalAlertService } from "../services/vitalAlertService.js";

export const alertController = {
  getActiveAlerts: async (req, res) => {
    try {
      const alerts = vitalAlertService.getAlerts();
      return res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getAllHistory: async (req, res) => {
    try {
      const history = vitalAlertService.getAllAlertsHistory();
      return res.status(200).json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  acknowledgeAlert: async (req, res) => {
    try {
      const alertId = req.params.id;
      const acknowledged = await vitalAlertService.acknowledgeAlert(alertId, req.user);
      return res.status(200).json({
        success: true,
        message: "Vital spike alert acknowledged. Alert state shifted to SILENT.",
        data: acknowledged
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  },

  simulateSpike: async (req, res) => {
    try {
      const scenario = req.body.scenario || "hypertensive";
      const simulated = vitalAlertService.simulateSpike(scenario);
      return res.status(201).json({
        success: true,
        message: `Biomedical spike simulation triggered [${simulated.alert_type}]. Timing state: ALERT -> SENDING (${simulated.dispatch_latency_ms}ms latency).`,
        data: simulated
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
