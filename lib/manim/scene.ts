/**
 * A Manim scene in the browser: a three.js renderer with an orthographic
 * camera whose frame is 8 units tall (as in Manim), a second fixed layer
 * for titles and captions (Manim's fixed-in-frame mobjects), and a clock
 * that plays animations. It only renders while something is moving.
 */

import * as THREE from 'three';
import { Animation, Group, Wait } from './animation';
import { BACKGROUND } from './colors';
import { RESOLUTION, STROKE_SCALE, Stroke } from './mobject';

export const FRAME_HEIGHT = 8;

interface Running {
  anim: Animation;
  t: number;
  resolve: () => void;
}

export class ManimScene {
  readonly renderer: THREE.WebGLRenderer;
  /** What the camera moves over: the equation. */
  readonly world = new THREE.Scene();
  /** Fixed in frame: titles and captions. */
  readonly hud = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  readonly hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  /** The camera frame, in world units: Manim's self.camera.frame. */
  readonly frame = { center: new THREE.Vector2(0, 0), height: FRAME_HEIGHT };
  timeScale = 1;
  private paused = false;
  private running: Running[] = [];
  private looping = false;
  private last = 0;
  private resizeObserver: ResizeObserver;
  private bg = new THREE.Scene();
  private bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private pendingFrame = 0;
  aspect = 16 / 9;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(BACKGROUND, 1);
    this.renderer.autoClear = false;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // A barely-there vignette, so the black reads as a screen rather than a hole.
    const vignette = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: { inner: { value: new THREE.Color('#111114') }, outer: { value: new THREE.Color('#060607') } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader:
          'uniform vec3 inner; uniform vec3 outer; varying vec2 vUv; void main() { vec2 d = (vUv - 0.5) * vec2(1.25, 1.0); float t = smoothstep(0.15, 0.85, length(d) * 1.35); gl_FragColor = vec4(mix(inner, outer, t), 1.0); }',
      })
    );
    this.bg.add(vignette);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  get isPaused() {
    return this.paused;
  }

  get isBusy() {
    return this.running.length > 0;
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p && this.running.length) this.startLoop();
  }

  /** Plays animations together; resolves when they have all finished (or been skipped). */
  play(...anims: Animation[]): Promise<void> {
    const anim = anims.length === 1 ? anims[0] : new Group(anims);
    anim.begin();
    return new Promise((resolve) => {
      this.running.push({ anim, t: 0, resolve });
      this.startLoop();
    });
  }

  wait(seconds: number) {
    return this.play(new Wait(seconds));
  }

  /** Jumps every running animation to its end state. */
  finishAll() {
    const all = this.running;
    this.running = [];
    for (const r of all) {
      r.anim.update(1);
      r.anim.end();
      r.resolve();
    }
    this.requestRender();
  }

  requestRender() {
    if (this.looping || this.pendingFrame) return;
    this.pendingFrame = requestAnimationFrame(() => {
      this.pendingFrame = 0;
      this.render();
    });
  }

  private startLoop() {
    if (this.looping || this.paused) return;
    this.looping = true;
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.tick);
  }

  private tick = () => {
    const now = performance.now();
    // Cap the step, so a background tab does not jump the animation to its end.
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    if (!this.paused) {
      const done: Running[] = [];
      for (const r of this.running) {
        r.t += dt * this.timeScale;
        const alpha = r.anim.runTime > 0 ? Math.min(r.t / r.anim.runTime, 1) : 1;
        r.anim.update(alpha);
        if (alpha >= 1) done.push(r);
      }
      for (const r of done) {
        this.running.splice(this.running.indexOf(r), 1);
        r.anim.end();
        r.resolve();
      }
    }
    this.render();
    if (!this.running.length || this.paused) {
      this.looping = false;
      this.renderer.setAnimationLoop(null);
    }
  };

  private updateCameras() {
    const h = this.frame.height;
    const w = h * this.aspect;
    const c = this.frame.center;
    Object.assign(this.camera, { left: c.x - w / 2, right: c.x + w / 2, top: c.y + h / 2, bottom: c.y - h / 2 });
    this.camera.updateProjectionMatrix();
    const hw = (FRAME_HEIGHT * this.aspect) / 2;
    Object.assign(this.hudCamera, { left: -hw, right: hw, top: FRAME_HEIGHT / 2, bottom: -FRAME_HEIGHT / 2 });
    this.hudCamera.updateProjectionMatrix();
  }

  render() {
    this.updateCameras();
    this.renderer.clear();
    this.renderer.render(this.bg, this.bgCamera);
    this.renderer.render(this.world, this.camera);
    this.renderer.render(this.hud, this.hudCamera);
  }

  private resize() {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    RESOLUTION.set(w, h);
    // Manim widths are in units where 4 is a normal line on a 1080p frame.
    STROKE_SCALE.px = (1.35 * h) / 1080;
    const refresh = (o: THREE.Object3D) => o instanceof Stroke && o.refreshWidth();
    this.world.traverse(refresh);
    this.hud.traverse(refresh);
    this.render();
  }

  /** Frame width in world units at the current zoom. */
  get frameWidth() {
    return this.frame.height * this.aspect;
  }

  /** A pointer position as world coordinates (the moving layer). */
  worldFromClient(clientX: number, clientY: number): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width - 0.5;
    const ny = 0.5 - (clientY - r.top) / r.height;
    return new THREE.Vector2(this.frame.center.x + nx * this.frameWidth, this.frame.center.y + ny * this.frame.height);
  }

  /** A world point as CSS pixels from the canvas's top left. */
  clientFromWorld(p: THREE.Vector2): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((p.x - this.frame.center.x) / this.frameWidth + 0.5) * r.width,
      (0.5 - (p.y - this.frame.center.y) / this.frame.height) * r.height
    );
  }

  /** Removes and frees everything on the stage. */
  clear() {
    for (const layer of [this.world, this.hud]) {
      [...layer.children].forEach((c) => {
        c.traverse((o) => {
          const m = o as THREE.Mesh;
          const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          mats.forEach((x) => x.dispose());
        });
        c.removeFromParent();
      });
    }
  }

  dispose() {
    this.running = [];
    this.renderer.setAnimationLoop(null);
    if (this.pendingFrame) cancelAnimationFrame(this.pendingFrame);
    this.resizeObserver.disconnect();
    this.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
