/* =================================================================
 *  main.js — Orquesta toda la experiencia 3D
 *
 *  Estados:
 *    'idle'     → antes de iniciar la escena
 *    'tunnel'   → partículas warp hacia el centro
 *    'morph'    → partículas se reorganizan a galaxia + corazón
 *    'explore'  → galaxia gira, corazón late, nodos orbitantes
 * ================================================================= */

import { SceneManager }    from './modules/scene.js';
import { TunnelSystem }    from './modules/tunnel.js';
import { GalaxySystem }    from './modules/galaxy.js';
import { HeartSystem }     from './modules/heart.js';
import { OrbitNodeSystem } from './modules/orbitNodes.js';
import { ModalManager }    from './modules/modal.js';

// ─── Globals ─────────────────────────────────────────────────────
let state = 'idle';
let sceneManager, tunnel, galaxy, heart, orbitNodes, modal;

// ─── DOM References ──────────────────────────────────────────────
const landing   = document.getElementById('landing');
const ctaBtn    = document.getElementById('cta');
const hud       = document.getElementById('hud');
const modalRoot = document.getElementById('modal-root');
const canvas    = document.getElementById('three-canvas');

// ─── CTA → Start experience ─────────────────────────────────────
ctaBtn.addEventListener('click', startExperience);

function startExperience() {
  // Prevent double-clicks
  ctaBtn.disabled = true;

  // Fade out landing
  landing.classList.add('hide');

  // After CSS transition completes, boot the 3D scene
  setTimeout(() => {
    landing.style.display = 'none';
    boot3D();
  }, 850);
}

// ─── Boot Three.js ───────────────────────────────────────────────
function boot3D() {
  // 1. Init the scene manager (renderer, camera, lights)
  sceneManager = new SceneManager(canvas);

  // 2. Create the tunnel system and start warp animation
  tunnel = new TunnelSystem(sceneManager);
  tunnel.create();
  state = 'tunnel';

  // 3. Start render loop
  sceneManager.startLoop(tick);
}

// ─── Main tick (called every frame via requestAnimationFrame) ────
function tick(delta, elapsed) {
  switch (state) {

    case 'tunnel':
      tunnel.update(delta, elapsed);

      // Check if tunnel animation is done
      if (tunnel.isComplete()) {
        tunnel.dispose();
        onTunnelComplete();
      }
      break;

    case 'morph':
      // Particles morphing to final positions — handled inside each system
      galaxy.update(delta, elapsed);
      heart.update(delta, elapsed);
      break;

    case 'explore':
      galaxy.update(delta, elapsed);
      heart.update(delta, elapsed);
      orbitNodes.update(delta, elapsed);
      break;
  }
}

// ─── Post-tunnel transition ──────────────────────────────────────
function onTunnelComplete() {
  // Create galaxy (spiral in XZ plane)
  galaxy = new GalaxySystem(sceneManager);
  galaxy.create();

  // Create 3D heart at center
  heart = new HeartSystem(sceneManager);
  heart.create();

  // Create orbit nodes (interactive bubbles)
  orbitNodes = new OrbitNodeSystem(sceneManager);
  orbitNodes.create();

  state = 'morph';

  // Ease camera position
  sceneManager.easeCamera({ x: 0, y: 10, z: 32 }, 2.5, () => {
    state = 'explore';
    hud.classList.add('visible');
  });
}

// ─── Pointer interaction (raycasting) ────────────────────────────
canvas.addEventListener('pointerdown', (ev) => {
  if (state !== 'explore') return;

  const hit = orbitNodes.handleClick(ev.clientX, ev.clientY);
  if (hit) {
    showModal(hit);
  }
});

// ─── Modal management ────────────────────────────────────────────
modal = new ModalManager(modalRoot);

function showModal(nodeData) {
  hud.classList.remove('visible');
  modal.open(nodeData);
}

// Close modal via event delegation
modalRoot.addEventListener('click', (ev) => {
  if (ev.target.closest('.modal-close-btn')) {
    modal.close();
    hud.classList.add('visible');
  }
});

// Close on backdrop click
modalRoot.addEventListener('click', (ev) => {
  if (ev.target === modalRoot) {
    modal.close();
    hud.classList.add('visible');
  }
});

// ─── Window resize ───────────────────────────────────────────────
window.addEventListener('resize', () => {
  if (sceneManager) sceneManager.onResize();
});

// ─── Cleanup on unload ──────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (sceneManager) sceneManager.dispose();
});
