/* =================================================================
 *  scene.js — Scene Manager
 *
 *  Encapsula WebGLRenderer, PerspectiveCamera, Scene, Clock,
 *  Raycaster, luces, y el render loop.
 * ================================================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas — el <canvas> del DOM
   */
  constructor(canvas) {
    // ── Renderer ──────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x for performance
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Scene ─────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030014);
    this.scene.fog = new THREE.FogExp2(0x030014, 0.008);

    // ── Camera ────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      60,                                           // FOV
      window.innerWidth / window.innerHeight,       // aspect
      0.1,                                          // near
      2000                                          // far
    );
    this.camera.position.set(0, 0, 80);
    this.camera.lookAt(0, 0, 0);

    // ── Clock ─────────────────────────────────────────────────
    this.clock = new THREE.Clock();

    // ── Raycaster ─────────────────────────────────────────────
    this.raycaster = new THREE.Raycaster();

    // ── Lights ────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const point = new THREE.PointLight(0x7c3aed, 2, 100);
    point.position.set(0, 10, 5);
    this.scene.add(point);

    // ── Camera ease state ─────────────────────────────────────
    this._cameraEase = null;

    // ── Loop ──────────────────────────────────────────────────
    this._tickCb = null;
    this._loopBound = this._loop.bind(this);
  }

  /* ============================================================
     PUBLIC: start the animation loop
     ============================================================ */
  startLoop(callback) {
    this._tickCb = callback;
    this.renderer.setAnimationLoop(this._loopBound);
  }

  /* ============================================================
     PRIVATE: the internal loop
     ============================================================ */
  _loop() {
    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Camera easing
    if (this._cameraEase) {
      this._updateCameraEase(delta);
    }

    // App tick
    if (this._tickCb) this._tickCb(delta, elapsed);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /* ============================================================
     PUBLIC: smoothly move camera to target position
     ============================================================ */
  easeCamera(target, duration, onComplete) {
    this._cameraEase = {
      start: this.camera.position.clone(),
      end: new THREE.Vector3(target.x, target.y, target.z),
      duration,
      elapsed: 0,
      onComplete,
    };
  }

  _updateCameraEase(delta) {
    const e = this._cameraEase;
    e.elapsed += delta;
    // Smooth-step easing t ∈ [0,1]
    let t = Math.min(e.elapsed / e.duration, 1);
    t = t * t * (3 - 2 * t); // smoothstep

    this.camera.position.lerpVectors(e.start, e.end, t);
    this.camera.lookAt(0, 0, 0);

    if (t >= 1) {
      if (e.onComplete) e.onComplete();
      this._cameraEase = null;
    }
  }

  /* ============================================================
     PUBLIC: resize handler
     ============================================================ */
  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ============================================================
     PUBLIC: cleanup
     ============================================================ */
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
