/* =================================================================
 *  heart.js — Corazón 3D Paramétrico de Partículas
 *
 *  MATEMÁTICA:
 *  ──────────
 *  El corazón usa la ecuación paramétrica clásica en 2D:
 *
 *    x(t) = 16 · sin³(t)
 *    y(t) = 13·cos(t) − 5·cos(2t) − 2·cos(3t) − cos(4t)
 *
 *  con t ∈ [0, 2π].
 *
 *  Para convertirlo en 3D, aplicamos una "revolución" parcial:
 *  Para cada punto (x2d, y2d) de la curva 2D, lo extrudimos
 *  en el eje Z usando otro parámetro φ (phi):
 *
 *    x3d = x2d · cos(φ)
 *    y3d = y2d
 *    z3d = x2d · sin(φ)
 *
 *  donde φ ∈ [0, 2π]. Esto rota la silueta del corazón alrededor
 *  del eje Y, creando un sólido de revolución con forma de corazón 3D.
 *
 *  Se añade ruido para que las partículas no estén perfectamente
 *  en la superficie → efecto de "nube de partículas" volumétrica.
 *
 *  ANIMACIÓN:
 *  ──────────
 *  - Rotación lenta alrededor de Y.
 *  - "Latido" (pulsing) usando sin(elapsed) para escalar
 *    periódicamente el corazón.
 * ================================================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ─── Configuración ───────────────────────────────────────────────
const PARTICLE_COUNT = 3000;      // Partículas en el corazón
const SCALE          = 0.18;      // Escala base del corazón
const SURFACE_NOISE  = 0.15;      // Ruido en la superficie
const ROTATION_SPEED = 0.2;       // rad/s
const PULSE_AMP      = 0.06;      // Amplitud del latido
const PULSE_FREQ     = 1.5;       // Frecuencia del latido (Hz)

// ─── Shaders ─────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aSize;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (180.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 10.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Falloff suave con glow extra
    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    strength = pow(strength, 1.2);

    // Glow rosado/rojo vibrante
    gl_FragColor = vec4(vColor * strength * 1.6, strength * 0.9);
  }
`;

// ─── Clase ───────────────────────────────────────────────────────

export class HeartSystem {
  /**
   * @param {import('./scene.js').SceneManager} mgr
   */
  constructor(mgr) {
    this.mgr = mgr;
    this.points = null;
    this.geometry = null;
    this.material = null;
  }

  /* ============================================================
     Crear el corazón 3D
     ============================================================ */
  create() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);
    const color     = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // ── Parámetro t para la curva 2D del corazón ──
      const t = (i / PARTICLE_COUNT) * Math.PI * 2;

      // ── Ecuación paramétrica del corazón 2D ──
      // x(t) = 16 · sin³(t)
      const sinT = Math.sin(t);
      const x2d = 16 * sinT * sinT * sinT;

      // y(t) = 13cos(t) − 5cos(2t) − 2cos(3t) − cos(4t)
      const y2d = 13 * Math.cos(t)
                 - 5 * Math.cos(2 * t)
                 - 2 * Math.cos(3 * t)
                 - Math.cos(4 * t);

      // ── Revolución 3D alrededor del eje Y ──
      // φ (phi) = ángulo aleatorio [0, 2π] para distribuir
      // las partículas por toda la superficie de revolución
      const phi = Math.random() * Math.PI * 2;

      // Coordenadas 3D:
      //   x3d = x2d · cos(φ)   (la "silueta" rota en XZ)
      //   y3d = y2d             (altura se mantiene)
      //   z3d = x2d · sin(φ)   (la otra componente de la rotación)
      let x3d = x2d * Math.cos(phi);
      let y3d = y2d;
      let z3d = x2d * Math.sin(phi);

      // ── Ruido volumétrico ──
      // Agregamos variación para que no sea una superficie perfecta
      x3d += (Math.random() - 0.5) * SURFACE_NOISE * 16;
      y3d += (Math.random() - 0.5) * SURFACE_NOISE * 16;
      z3d += (Math.random() - 0.5) * SURFACE_NOISE * 16;

      // Aplicar escala
      positions[i * 3]     = x3d * SCALE;
      positions[i * 3 + 1] = y3d * SCALE;
      positions[i * 3 + 2] = z3d * SCALE;

      // ── Color: gradiente de rojo profundo a rosa brillante ──
      // La variación se basa en la posición vertical (y2d)
      const normalizedY = (y2d + 17) / 34; // y2d ∈ [-17, 17] → [0, 1]
      const hue = 0.93 + normalizedY * 0.07; // rojo-magenta (0.93-1.0 en HSL)
      const sat = 0.8 + Math.random() * 0.2;
      const lgt = 0.35 + normalizedY * 0.3;

      color.setHSL(hue % 1, sat, lgt);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Tamaño: ligeramente aleatorio
      sizes[i] = 1.5 + Math.random() * 2.5;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
      transparent:  true,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    // Centrar el corazón un poco arriba para que quede dentro de la galaxia
    this.points.position.set(0, 1.5, 0);
    this.mgr.scene.add(this.points);
  }

  /* ============================================================
     Animación: rotación + latido
     ============================================================ */
  update(delta, elapsed) {
    if (!this.points) return;

    // Rotación suave
    this.points.rotation.y += ROTATION_SPEED * delta;

    // Pulso/latido: escala oscila con sin(tiempo)
    // sin(freq * elapsed * 2π) genera un ciclo completo cada 1/freq segundos
    const pulse = 1.0 + Math.sin(elapsed * PULSE_FREQ * Math.PI * 2) * PULSE_AMP;
    this.points.scale.setScalar(pulse);
  }

  /* ============================================================
     Limpieza
     ============================================================ */
  dispose() {
    if (this.points) this.mgr.scene.remove(this.points);
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}
