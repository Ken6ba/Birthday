/* =================================================================
 *  galaxy.js — Galaxia Espiral de Partículas en el plano XZ
 *
 *  MATEMÁTICA:
 *  ──────────
 *  Una galaxia espiral se modela con la ecuación de Espiral
 *  Logarítmica:
 *
 *    r(θ) = a · e^(b·θ)
 *
 *  donde:
 *    - a = escala inicial (radio mínimo)
 *    - b = tasa de crecimiento (qué tan "apretada" es la espiral)
 *    - θ = ángulo paramétrico
 *
 *  Para crear múltiples brazos, sumamos un offset angular:
 *    θ_brazo = θ + (2π / numBrazos) × índiceBrazo
 *
 *  Se añade ruido gaussiano a (x, z) y una variación vertical (y)
 *  para dar espesor 3D al disco.
 *
 *  COLOR:
 *  ─────
 *  El tono (hue) varía con el ángulo θ en HSL:
 *    - Centro: cálido (dorado/naranja)
 *    - Exterior: frío (azul/violeta)
 *  Esto simula cómo las galaxias reales tienen centros más brillantes
 *  y bordes más azulados.
 *
 *  ANIMACIÓN:
 *  ──────────
 *  La galaxia rota lentamente alrededor del eje Y.
 * ================================================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ─── Configuración ───────────────────────────────────────────────
const PARTICLE_COUNT = 15000;   // Más partículas para que se vea súper claro
const ARMS           = 4;       // 4 brazos espirales
const A              = 0.5;     // Escala inicial de la espiral
const B              = 0.15;    // Tasa de crecimiento logarítmica
const MAX_THETA      = 8 * Math.PI; // Vueltas
const Y_SPREAD       = 1.5;     // Espesor vertical del disco
const NOISE          = 1.2;     // Ruido posicional
const ROTATION_SPEED = 0.05;    // rad/s

// ─── Shaders ─────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aSize;
  varying vec3 vColor;

  void main() {
    vColor = color;  // Three.js inyecta 'color' cuando vertexColors = true
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Tamaño de punto basado en distancia a cámara
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    // Clamp para evitar puntos gigantes en close-up
    gl_PointSize = clamp(gl_PointSize, 1.0, 12.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Disco suave con falloff radial
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    // Brillo extra en el centro de cada punto
    strength = pow(strength, 1.5);

    gl_FragColor = vec4(vColor * strength * 1.4, strength * 0.85);
  }
`;

// ─── Utilidades ──────────────────────────────────────────────────

/** Ruido gaussiano aproximado (Box-Müller) */
function gaussRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Clase ───────────────────────────────────────────────────────

export class GalaxySystem {
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
     Crear la galaxia espiral
     ============================================================ */
  create() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);
    const color     = new THREE.Color();

    const perArm = Math.floor(PARTICLE_COUNT / ARMS);

    for (let arm = 0; arm < ARMS; arm++) {
      // Offset angular para este brazo
      const armOffset = (2 * Math.PI / ARMS) * arm;

      for (let i = 0; i < perArm; i++) {
        const idx = (arm * perArm + i);
        if (idx >= PARTICLE_COUNT) break;

        // t ∈ [0, 1] → progreso a lo largo del brazo
        const t = i / perArm;

        // θ: ángulo paramétrico (más t = más vueltas)
        const theta = t * MAX_THETA + armOffset;

        // r(θ) = a · e^(b·θ) — espiral logarítmica
        const r = A * Math.exp(B * theta);

        // Convertimos polar a cartesiano (en XZ, Y es "arriba")
        let x = r * Math.cos(theta);
        let z = r * Math.sin(theta);
        let y = gaussRandom() * Y_SPREAD * (1 - t * 0.5); // centro más grueso

        // Añadimos ruido posicional para naturalismo
        x += gaussRandom() * NOISE * (0.5 + t);
        z += gaussRandom() * NOISE * (0.5 + t);

        positions[idx * 3]     = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Color: vía láctea rosada/morada
        // HSL: hue va de 0.85 (magenta/rosa) a 0.75 (morado/violeta)
        const hue        = 0.85 - t * 0.15;
        const saturation = 0.8 + (1 - t) * 0.2;
        const lightness  = 0.5 + (1 - t) * 0.4;

        color.setHSL(hue, saturation, lightness);
        colors[idx * 3]     = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        // Tamaño: partículas del centro más grandes
        sizes[idx] = 3.0 + (1 - t) * 4.0 + Math.random() * 2.5;
      }
    }

    // Partículas "de relleno" del núcleo brillante
    for (let i = ARMS * perArm; i < PARTICLE_COUNT; i++) {
      const r     = Math.sqrt(Math.random()) * 3;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3]     = r * Math.cos(theta) + gaussRandom() * 0.5;
      positions[i * 3 + 1] = gaussRandom() * 0.8;
      positions[i * 3 + 2] = r * Math.sin(theta) + gaussRandom() * 0.5;

      // Rosa muy brillante en el centro
      color.setHSL(0.9, 0.9, 0.85); 
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 4 + Math.random() * 3;
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
    this.mgr.scene.add(this.points);
  }

  /* ============================================================
     Rotación lenta de la galaxia
     ============================================================ */
  update(delta) {
    if (!this.points) return;
    // Rotación alrededor del eje Y (el "norte" de la galaxia)
    this.points.rotation.y += ROTATION_SPEED * delta;
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
