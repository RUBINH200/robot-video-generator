// Glass Data - Video Player & POV Visualizer Module

export class RobotVideoPlayer {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.currentTask = null;
    this.currentClip = null;
    this.isPlaying = true;
    this.playbackRate = 1.0;
    this.currentTime = 0; // seconds
    this.totalDuration = 14; // seconds
    this.animationFrameId = null;
    this.onTimeUpdate = options.onTimeUpdate || (() => {});

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio || 800;
    this.canvas.height = rect.height * window.devicePixelRatio || 450;
  }

  loadClip(task, clip) {
    this.currentTask = task;
    this.currentClip = clip;
    this.currentTime = 0;
    
    // Parse duration string e.g. "00:14" -> 14
    if (clip && clip.duration) {
      const parts = clip.duration.split(':');
      this.totalDuration = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else {
      this.totalDuration = 12;
    }

    this.initCanvasSize();
    this.startPlaybackLoop();
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.startPlaybackLoop();
    }
  }

  seek(percentage) {
    this.currentTime = Math.max(0, Math.min(this.totalDuration, percentage * this.totalDuration));
    this.renderFrame();
    this.onTimeUpdate(this.currentTime, this.totalDuration);
  }

  setSpeed(rate) {
    this.playbackRate = rate;
  }

  startPlaybackLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    let lastTimestamp = performance.now();

    const loop = (timestamp) => {
      if (!this.isPlaying) return;

      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      this.currentTime += delta * this.playbackRate;
      if (this.currentTime >= this.totalDuration) {
        this.currentTime = 0; // Loop clip
      }

      this.renderFrame();
      this.onTimeUpdate(this.currentTime, this.totalDuration);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  renderFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background gradient for task scene
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#040d17');
    grad.addColorStop(0.5, '#0b1d2e');
    grad.addColorStop(1, '#02060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic grid & depth points
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Render Simulated Robotic Arm & Object Target
    this.renderRobotArmPOV(ctx, w, h);

    // Real-time HUD overlay graphics on frame
    this.renderHUDTelemetryOnCanvas(ctx, w, h);
  }

  renderRobotArmPOV(ctx, w, h) {
    const t = this.currentTime;
    const cx = w * 0.5 + Math.sin(t * 1.5) * 30;
    const cy = h * 0.55 + Math.cos(t * 1.2) * 20;

    // Robotic End-Effector / Gripper (Dual Finger Cybernetic Gripper)
    ctx.save();
    ctx.translate(cx, cy);

    // Object target bounding box
    const objWidth = 140;
    const objHeight = 90;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(-objWidth / 2, -objHeight / 2, objWidth, objHeight);
    ctx.setLineDash([]);

    // Object label badge
    ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.fillRect(-objWidth / 2, -objHeight / 2 - 20, 110, 18);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.fillText((this.currentTask?.title || 'TARGET_OBJ').substring(0, 12).toUpperCase(), -objWidth / 2 + 5, -objHeight / 2 - 6);

    // Gripper Left Finger
    const gripProgress = (Math.sin(t * 2) + 1) / 2; // 0..1 open/close
    const fingerGap = 45 - gripProgress * 25;

    ctx.fillStyle = '#1c2e3d';
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2;

    // Left Finger
    ctx.beginPath();
    ctx.rect(-fingerGap - 20, -60, 20, 100);
    ctx.fill();
    ctx.stroke();

    // Right Finger
    ctx.beginPath();
    ctx.rect(fingerGap, -60, 20, 100);
    ctx.fill();
    ctx.stroke();

    // Gripper Wrist Base
    ctx.fillStyle = '#0e1822';
    ctx.strokeStyle = '#00f0ff';
    ctx.beginPath();
    ctx.roundRect(-50, -110, 100, 50, 6);
    ctx.fill();
    ctx.stroke();

    // Wrist status LED
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(0, -85, 5, 0, Math.PI * 2);
    ctx.fill();

    // Laser Tracking Crosshairs
    ctx.strokeStyle = 'rgba(255, 51, 68, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, 25);
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();

    ctx.restore();
  }

  renderHUDTelemetryOnCanvas(ctx, w, h) {
    const t = this.currentTime;
    ctx.save();

    // Angle & Confidence Top Box
    ctx.fillStyle = 'rgba(4, 10, 16, 0.75)';
    ctx.fillRect(15, 15, 220, 55);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.strokeRect(15, 15, 220, 55);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px Orbitron';
    ctx.fillText(`CAM: ${this.currentClip?.angle || 'POV HEADCAM'}`, 25, 35);

    ctx.fillStyle = '#00ffaa';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`CONFIDENCE: ${this.currentClip?.confidence || '99.4%'}`, 25, 54);

    // Bottom Telemetry Coordinates
    const xCoord = (+12.45 + Math.sin(t * 0.8) * 0.35).toFixed(3);
    const yCoord = (-04.18 + Math.cos(t * 0.9) * 0.28).toFixed(3);
    const zCoord = (+01.27 + Math.sin(t * 1.1) * 0.15).toFixed(3);

    ctx.fillStyle = 'rgba(4, 10, 16, 0.75)';
    ctx.fillRect(w - 235, h - 60, 220, 45);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.strokeRect(w - 235, h - 60, 220, 45);

    ctx.fillStyle = '#e6f6ff';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`X:${xCoord}  Y:${yCoord}  Z:${zCoord}`, w - 225, h - 38);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`GRIP TORQUE: ${(1.2 + Math.sin(t * 3) * 0.4).toFixed(2)} N*m`, w - 225, h - 22);

    ctx.restore();
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
