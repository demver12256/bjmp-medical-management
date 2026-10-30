/**
 * BJMP Biomedical Vital Spike Alert & Telemetry Monitor Simulation
 * Enforces timing diagram state machine: NORMAL -> ALERT (<30ms) -> SENDING -> SILENT
 */

class VitalMonitorEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.audioCtx = null;
    this.isMuted = false;
    this.currentState = "NORMAL"; // NORMAL | ALERT | SENDING | SILENT
    this.latencyMs = 0;
    this.activeAlarm = null;
    this.alarmInterval = null;
    this.wavePoints = [];
    this.waveX = 0;
    this.heartRate = 75;
  }

  init(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.startWaveform();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.parentElement.clientWidth || 500;
    this.canvas.height = 140;
    this.wavePoints = new Array(Math.floor(this.canvas.width)).fill(this.canvas.height / 2);
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  playBeep(freq = 880, duration = 0.15, type = "sine") {
    if (this.isMuted) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio alert suppressed:", e);
    }
  }

  startAlarmAudio() {
    if (this.alarmInterval) clearInterval(this.alarmInterval);
    // Double high-urgency telemetry pulse
    this.alarmInterval = setInterval(() => {
      this.playBeep(980, 0.12, "sawtooth");
      setTimeout(() => this.playBeep(1200, 0.18, "sawtooth"), 140);
    }, 1800);
  }

  stopAlarmAudio() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  setAlarm(alertObj) {
    this.activeAlarm = alertObj;
    this.currentState = "SENDING";
    this.latencyMs = alertObj.dispatch_latency_ms || 18.4;
    this.heartRate = (alertObj.trigger_vitals && alertObj.trigger_vitals.heart_rate) || 135;
    this.startAlarmAudio();
    this.updateStatePill();
  }

  clearAlarm() {
    this.activeAlarm = null;
    this.currentState = "SILENT";
    this.stopAlarmAudio();
    this.heartRate = 72;
    this.updateStatePill();
    setTimeout(() => {
      if (this.currentState === "SILENT") {
        this.currentState = "NORMAL";
        this.updateStatePill();
      }
    }, 4000);
  }

  updateStatePill() {
    const pill = document.getElementById("monitorStatePill");
    const latencyEl = document.getElementById("monitorLatencyEl");
    if (!pill) return;

    if (this.currentState === "SENDING" || this.currentState === "ALERT") {
      pill.className = "px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse";
      pill.innerHTML = `⚠️ ${this.currentState} (<30ms Queue)`;
      if (latencyEl) latencyEl.innerText = `${this.latencyMs} ms`;
    } else if (this.currentState === "SILENT") {
      pill.className = "px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40";
      pill.innerHTML = "🔕 SILENT (Physician Acknowledged)";
      if (latencyEl) latencyEl.innerText = "--";
    } else {
      pill.className = "px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      pill.innerHTML = "🟢 NORMAL RHYTHM";
      if (latencyEl) latencyEl.innerText = "< 5 ms";
    }
  }

  startWaveform() {
    let phase = 0;
    const draw = () => {
      if (!this.canvas || !this.ctx) return;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const mid = h / 2;

      this.ctx.fillStyle = "rgba(9, 14, 26, 0.25)";
      this.ctx.fillRect(0, 0, w, h);

      // Grid lines
      this.ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let x = 0; x < w; x += 30) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 20) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
      }
      this.ctx.stroke();

      // ECG calculation based on heart rate
      const beatInterval = Math.max(20, Math.floor(6000 / this.heartRate));
      const step = phase % beatInterval;
      let yVal = mid;

      if (step === 2) yVal = mid - 8; // P wave
      else if (step === 4) yVal = mid;
      else if (step === 6) yVal = mid + 6; // Q wave
      else if (step === 8) yVal = mid - 46; // R spike
      else if (step === 10) yVal = mid + 18; // S wave
      else if (step === 14) yVal = mid - 12; // T wave
      else yVal = mid + (Math.random() - 0.5) * 2; // Baseline noise

      this.wavePoints[this.waveX] = yVal;

      // Draw trace
      const isAlarm = this.currentState === "SENDING" || this.currentState === "ALERT";
      this.ctx.strokeStyle = isAlarm ? "#ef4444" : "#06b6d4";
      this.ctx.lineWidth = isAlarm ? 2.5 : 2;
      this.ctx.shadowBlur = isAlarm ? 12 : 8;
      this.ctx.shadowColor = isAlarm ? "rgba(239, 68, 68, 0.8)" : "rgba(6, 182, 212, 0.8)";

      this.ctx.beginPath();
      for (let i = 0; i < w; i++) {
        if (i === 0) this.ctx.moveTo(i, this.wavePoints[i]);
        else this.ctx.lineTo(i, this.wavePoints[i]);
      }
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Scanning cursor
      this.ctx.fillStyle = isAlarm ? "#fca5a5" : "#67e8f9";
      this.ctx.beginPath();
      this.ctx.arc(this.waveX, yVal, 3.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.waveX = (this.waveX + 2) % w;
      phase++;

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }
}

window.vitalMonitor = new VitalMonitorEngine();
