/* =================================================================
 *  tunnel.js — Túnel de Partículas (Efecto Warp / Viaje Espacial)
 *
 *  MATEMÁTICA:
 *  ──────────
 *  Las partículas se distribuyen en un cilindro alrededor del eje Z.
 *  Cada partícula tiene:
 *    - θ (ángulo polar aleatorio alrededor del eje Z)
 *    - r (radio aleatorio desde el centro del cilindro)
 *    - z (profundidad aleatoria en el rango [-depth, 0])
 *
 *  En cada frame, z += speed (se mueven hacia la cámara).
 *  Cuando z > cámara, se reciclan enviándolas de vuelta a -depth.
 *  Esto crea la ilusión de "viajar" a través del espacio.
 *
 *  El shader personalizado:
 *    - Vertex: calcula el tamaño en función de la distancia al ojo
 *      (partículas más cercanas se ven más grandes, simula perspectiva).
 *    - Fragment: dibuja un punto circular suave con brillo aditivo
 *      (gl_PointCoord genera UV de 0-1 por punto, y calculamos
 *       la distancia al centro para un falloff radial).
 *
 *  La opacidad se modula con la profundidad z para crear la
 *  sensación de estrellas que aparecen gradualmente desde la lejanía.
 *
 *  Después de DURATION_S segundos el túnel se marca como completo.
 * ================================================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ─── Configuración ───────────────────────────────────────────────
const PARTICLE_COUNT = 4000;    // Cantidad total de estrellas
const TUNNEL_DEPTH   = 200;     // Profundidad del túnel (eje Z negativo)
const TUNNEL_RADIUS  = 40;      // Radio máximo del cilindro
const SPEED          = 80;      // Unidades/segundo de avance
const DURATION_S     = 5;       // Duración del viaje en segundos

// ─── Shaders ─────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  // 'aSize' = tamaño individual por partícula
  attribute float aSize;

  // Pasamos alpha al fragment shader basado en profundidad
  varying float vAlpha;
  varying float vDist;

  void main() {
    // Transformamos la posición al espacio de la cámara (model-view)
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Alpha: partículas más lejanas (z muy negativo) → más transparentes
    // Normalizamos la distancia Z al rango [0,1]
    float depth = clamp(-mvPosition.z / ${TUNNEL_DEPTH.toFixed(1)}, 0.0, 1.0);
    vAlpha = 1.0 - depth * 0.85;  // nunca llega a 0 del todo

    // Tamaño del punto: inversamente proporcional a la distancia
    // 300.0 / -mvPosition.z es la fórmula clásica de Three.js
    gl_PointSize = aSize * (250.0 / -mvPosition.z);

    // Posición final en clip-space
    gl_Position = projectionMatrix * mvPosition;

    // Pasamos la distancia para el color del fragment
    vDist = depth;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vDist;

  void main() {
    // gl_PointCoord va de (0,0) a (1,1) dentro del cuadrado de cada punto.
    // Calculamos la distancia al centro (0.5, 0.5) para un disco suave.
    float dist = length(gl_PointCoord - vec2(0.5));

    // Descartamos píxeles fuera del radio 0.5 (hacemos un círculo)
    if (dist > 0.5) discard;

    // Falloff suave: máximo brillo en el centro, cae hacia el borde
    float strength = 1.0 - smoothstep(0.0, 0.5, dist);

    // Color: mezcla entre azul-violeta (lejano) y blanco-cyan (cercano)
    vec3 colorFar  = vec3(0.4, 0.2, 1.0);   // violeta
    vec3 colorNear = vec3(0.7, 0.9, 1.0);   // cyan-blanco
    vec3 color = mix(colorNear, colorFar, vDist);

    gl_FragColor = vec4(color * strength, strength * vAlpha);
  }
`;

// ─── Clase ───────────────────────────────────────────────────────

export class TunnelSystem {
  /**
   * @param {import('./scene.js').SceneManager} mgr
   */
  constructor(mgr) {
    this.mgr = mgr;
    this.points = null;
    this.geometry = null;
    this.material = null;
    this._elapsed = 0;
    this._done = false;
  }

  /* ============================================================
     Crear las partículas del túnel
     ============================================================ */
  create() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // θ: ángulo aleatorio en [0, 2π]
      const theta = Math.random() * Math.PI * 2;

      // r: radio con distribución sqrt para uniformidad en disco
      //    sin sqrt las partículas se agolpan en el centro
      const r = Math.sqrt(Math.random()) * TUNNEL_RADIUS;

      // Posición en el cilindro (eje Z es la profundidad)
      positions[i * 3]     = r * Math.cos(theta);       // X
      positions[i * 3 + 1] = r * Math.sin(theta);       // Y
      positions[i * 3 + 2] = -Math.random() * TUNNEL_DEPTH; // Z (negativo = lejos)

      // Tamaño: variación aleatoria para naturalismo
      sizes[i] = 1.5 + Math.random() * 3.5;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending:    THREE.AdditiveBlending,  // las partículas "suman" luz
      depthWrite:  false,                   // evita artefactos de profundidad
      transparent: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.mgr.scene.add(this.points);
  }

  /* ============================================================
     Actualizar cada frame
     ============================================================ */
  update(delta) {
    this._elapsed += delta;

    const positions = this.geometry.attributes.position.array;
    const advance   = SPEED * delta; // distancia que avanza cada partícula este frame

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3 + 2; // índice del componente Z

      // Avanzar hacia la cámara (sumar a Z)
      positions[idx] += advance;

      // Si la partícula pasó la cámara (z > 10), reciclarla al fondo
      if (positions[idx] > 10) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * TUNNEL_RADIUS;
        positions[i * 3]     = r * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(theta);
        positions[idx]       = -TUNNEL_DEPTH;
      }
    }

    // Indicar a Three.js que los datos cambiaron
    this.geometry.attributes.position.needsUpdate = true;

    // Marcar como completo después de la duración configurada
    if (this._elapsed >= DURATION_S) {
      this._done = true;
    }
  }

  /* ============================================================
     ¿Terminó la animación?
     ============================================================ */
  isComplete() {
    return this._done;
  }

  /* ============================================================
     Liberar memoria GPU
     ============================================================ */
  dispose() {
    if (this.points) {
      this.mgr.scene.remove(this.points);
    }
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.points = null;
  }
}
