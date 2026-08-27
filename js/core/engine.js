// ============================================================
// HELL TRAIN — core game engine
// ============================================================
import { CFG } from './config.js';

export class Engine {
  constructor(root) {
    this.root = root;
    this.canvas = document.createElement('canvas');
    this.canvas.width = CFG.VIEW_W; this.canvas.height = CFG.VIEW_H;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.imageRendering = 'crisp-edges';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    root.appendChild(this.canvas);
    this.scenes = {};
    this.current = null;
    this.t = 0;
    this.last = performance.now();
    this.lastRenderTime = 0;
    this.fps = 60;
    this.onResize = () => this._fit();
    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(() => this._fit());
  }
  _fit() {
    // Aspect-ratio fit. The internal canvas is the fixed pixel grid;
    // CSS scales it up nearest-neighbour.
    const rect = this.root.getBoundingClientRect();
    const ar = CFG.VIEW_W / CFG.VIEW_H;
    let w = rect.width, h = rect.height;
    if (w / h > ar) w = h * ar; else h = w / ar;
    this.canvas.style.width = Math.floor(w) + 'px';
    this.canvas.style.height = Math.floor(h) + 'px';
  }
  addScene(name, scene) { this.scenes[name] = scene; }
  // Swap back to an already-running scene WITHOUT re-entering it
  // (used by the pause menu so a run is never restarted by accident).
  resumeScene(scene) { if (scene) this.current = scene; }
  setScene(name, params = {}) {
    if (this.current?.exit) this.current.exit();
    this.current = this.scenes[name];
    this.current?.enter?.(params);
  }
  start() {
    const loop = (now) => {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > CFG.MAX_DT) dt = CFG.MAX_DT;
      this.t += dt;
      if (this.current?.update) this.current.update(dt, this.t);
      // Render at the native low resolution so pixels are crisp;
      // CSS handles the upscale with image-rendering: pixelated.
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.current?.render) this.current.render(this.ctx, this.t);
      // FPS smoothing
      this.lastRenderTime = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
