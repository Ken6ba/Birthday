/* =================================================================
 *  orbitNodes.js — Burbujas Flotantes (Efecto Billboard & Translúcido)
 * ================================================================= */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ─── Configuración ───────────────────────────────────────────────
const NODE_COUNT = 8;
const MIN_RADIUS = 8;
const MAX_RADIUS = 14;

// ─── Utilidad: Crear textura con texto para Sprites (Emojis o Texto) ───
function createTextTexture(text, bgColor, textColor, isLabel = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (isLabel) {
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparente para etiquetas
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Fondo semi-transparente del letrero
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(64, 24, 384, 80, 40);
    ctx.fill();

    // Texto blanco mayúsculas
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(text.toUpperCase(), 256, 64);
  } else {
    canvas.width = 512;
    canvas.height = 512;
    ctx.fillStyle = bgColor; // Transparente o color
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (text === '16') ctx.font = 'bold 280px sans-serif';
    else ctx.font = '200px sans-serif';
    ctx.fillText(text, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const NODE_DATA = [
  { 
    title: 'Spiderman',    
    desc: 'Un Spiderman colgado de cabeza, recordándote que a veces hay que ver el mundo desde otra perspectiva.', 
    tags: ['Spidey', 'AmigableVecino'],
    label: 'INFINITO',
    textureSrc: createTextTexture('🕷️', 'transparent', '#ffffff'),
    color: 0xef4444 // Rojo Spiderman
  },
  { 
    title: 'Baby Yoda', 
    desc: 'La fuerza es intensa en ti. Nunca dudes de lo que puedes lograr. 💚', 
    tags: ['Grogu', 'LaFuerza'],
    label: 'CONTIGO SIEMPRE',
    textureSrc: createTextTexture('👽', 'transparent', '#ffffff'),
    color: 0x10b981 // Verde Yoda
  },
  { 
    title: 'Ositos Románticos',       
    desc: 'Dos ositos tiernos que representan que siempre tendrás apoyo incondicional y cariño.', 
    tags: ['Amor', 'Ternura'],
    label: 'NEBULOSA DE BESOS',
    textureSrc: createTextTexture('🧸🧸', 'transparent', '#ffffff'),
    color: 0xec4899 // Rosa
  },
  { 
    title: 'Nuestra Amistad',        
    desc: 'Espero que nuestra amistad sea cada vez más fuerte. Veremos qué hace el destino.La quiero mucho. 🌟', 
    tags: ['Amistad', 'Destino'],
    label: 'GRAVEDAD DE AMOR',
    textureUrl: 'assets/foto_pareja.jpg',
    color: 0x8b5cf6 // Morado
  },
  { 
    title: '¡Felices 16!',            
    desc: 'Que no te rindas, que yo siempre voy a estar para ti. ¡Tienes 16 ahora, disfrútalos al máximo!', 
    tags: ['16', 'Felicidades'],
    label: 'FELICES 16',
    textureSrc: createTextTexture('16', 'transparent', '#ffffff'),
    color: 0xf59e0b // Naranja/Dorado
  },
  { 
    title: 'Futura Bestia',           
    desc: 'Solo tienes que ponerle un poco más de esfuerzo y vas a ser una bestia. ¡Tú puedes!', 
    tags: ['Esfuerzo', 'Informática'],
    label: 'FUTURA INGENIERA',
    textureSrc: createTextTexture('💻', 'transparent', '#ffffff'),
    color: 0x06b6d4 // Cyan
  },
  { 
    title: 'El Pastel',    
    desc: 'No podía faltar tu pastel de cumpleaños. ¡Pide un deseo enorme!', 
    tags: ['Pastel', 'Celebración'],
    label: 'A CELEBRAR',
    textureSrc: createTextTexture('🎂', 'transparent', '#ffffff'),
    color: 0x7c3aed // Violeta
  },
  { 
    title: 'Tu Compañía', 
    desc: 'Siempre a tu lado para celebrar cada uno de tus logros y acompañarte en cada paso.', 
    tags: ['Compañía', 'Siempre'],
    label: 'POR SIEMPRE',
    textureSrc: createTextTexture('✨', 'transparent', '#ffffff'),
    color: 0x6366f1 // Indigo
  },
];

export class OrbitNodeSystem {
  /**
   * @param {import('./scene.js').SceneManager} mgr
   */
  constructor(mgr) {
    this.mgr = mgr;
    this.groups = [];
    this.raycastMeshes = [];
    this.orbits = [];
    
    // Geometría para la burbuja translúcida
    this._bubbleGeo = new THREE.SphereGeometry(2.5, 32, 32); 
    this.textureLoader = new THREE.TextureLoader();
  }

  create() {
    for (let i = 0; i < NODE_COUNT; i++) {
      const data = NODE_DATA[i];
      const group = new THREE.Group();

      // 1. Burbuja Translúcida (Glass/Energy effect)
      const bubbleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: data.color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.25,
        roughness: 0.1,
        metalness: 0.1,
        depthWrite: false, // Importante para que el sprite de adentro se vea bien
        blending: THREE.AdditiveBlending
      });
      const bubbleMesh = new THREE.Mesh(this._bubbleGeo, bubbleMat);
      bubbleMesh.userData = { ...data }; // Para el Raycaster
      group.add(bubbleMesh);
      this.raycastMeshes.push(bubbleMesh); // Raycaster solo detecta la burbuja

      // 2. Sprite Interno (Efecto Billboard - Siempre mira a la cámara)
      const spriteMat = new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true
      });

      if (data.textureUrl) {
        this.textureLoader.load(data.textureUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          spriteMat.map = tex;
          spriteMat.needsUpdate = true;
        });
      } else if (data.textureSrc) {
        spriteMat.map = data.textureSrc;
      }
      
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3.5, 3.5, 1); // Tamaño de la imagen dentro de la bola
      group.add(sprite);

      // 3. Letrero inferior flotante (Sprite de texto)
      const labelTex = createTextTexture(data.label, 'transparent', '#ffffff', true);
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
      const labelSprite = new THREE.Sprite(labelMat);
      labelSprite.position.set(0, -3.2, 0); // Posicionado debajo de la bola
      labelSprite.scale.set(6, 1.5, 1);
      group.add(labelSprite);

      // 4. Datos orbitales asíncronos
      const orbit = {
        radius: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
        speed:  0.1 + Math.random() * 0.2, // Distintas velocidades
        angle:  (i / NODE_COUNT) * Math.PI * 2, // Espaciado inicial
        tilt:   (Math.random() - 0.5) * Math.PI * 0.3, // Inclinación orbital
        baseY:  (Math.random() - 0.5) * 6, // Altura base diferente
        bobSpeed: 1 + Math.random() * 2,   // Velocidad de flotación
        bobAmp: 0.5 + Math.random() * 1.5  // Amplitud de flotación
      };

      this.mgr.scene.add(group);
      this.groups.push(group);
      this.orbits.push(orbit);
    }
  }

  update(delta, elapsed) {
    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i];
      const orbit = this.orbits[i];

      // Giran alrededor del corazón central (trayectoria elíptica)
      orbit.angle += orbit.speed * delta;

      const x = orbit.radius * Math.cos(orbit.angle) * Math.cos(orbit.tilt);
      const z = orbit.radius * Math.sin(orbit.angle) * Math.cos(orbit.tilt);
      
      // Suben y bajan sutilmente (Efecto flotante)
      const bobbing = Math.sin(elapsed * orbit.bobSpeed) * orbit.bobAmp;
      const y = orbit.baseY + bobbing;

      group.position.set(x, y, z);
    }
  }

  handleClick(clientX, clientY) {
    const raycaster = this.mgr.raycaster;
    const camera    = this.mgr.camera;
    const canvas    = this.mgr.renderer.domElement;

    const mouse = new THREE.Vector2(
      (clientX / canvas.clientWidth) * 2 - 1,
      -(clientY / canvas.clientHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    raycaster.params.Mesh = { threshold: 1 };

    // Detectar intersección con las burbujas translúcidas
    const intersects = raycaster.intersectObjects(this.raycastMeshes, false);
    if (intersects.length > 0) return intersects[0].object.userData;
    return null;
  }

  dispose() {
    this.groups.forEach(g => {
      this.mgr.scene.remove(g);
    });
    if (this._bubbleGeo) this._bubbleGeo.dispose();
    this.groups = [];
    this.raycastMeshes = [];
    this.orbits = [];
  }
}
