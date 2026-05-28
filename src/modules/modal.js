/* =================================================================
 *  modal.js — Modal Flotante para Información de Nodos
 * ================================================================= */

export class ModalManager {
  /**
   * @param {HTMLElement} rootEl — #modal-root
   */
  constructor(rootEl) {
    this.root = rootEl;
    this._isOpen = false;
  }

  open(nodeData) {
    if (this._isOpen) this.close();

    const fragment = document.createDocumentFragment();

    const panel = document.createElement('div');
    panel.className = 'modal-panel text-center'; // Centrado para que parezca más una tarjeta de felicitación

    // Si hay una imagen URL, la mostramos en el modal también
    if (nodeData.textureUrl) {
      const img = document.createElement('img');
      img.src = nodeData.textureUrl;
      img.className = 'w-full h-48 object-cover rounded-lg mb-4 border border-white/10 shadow-lg';
      img.alt = nodeData.title;
      // Añadir evento de error por si no encuentra la imagen
      img.onerror = () => { img.style.display = 'none'; };
      panel.appendChild(img);
    }

    const title = document.createElement('h2');
    title.textContent = nodeData.title || 'Mensaje';
    panel.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = nodeData.desc || '';
    // Hacemos el texto un poco más grande y bonito
    desc.className = 'text-base text-gray-200 leading-relaxed mb-6';
    panel.appendChild(desc);

    if (nodeData.tags && nodeData.tags.length > 0) {
      const metaDiv = document.createElement('div');
      metaDiv.className = 'modal-meta justify-center'; // Centramos los tags

      nodeData.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'meta-tag';
        span.textContent = '#' + tag;
        metaDiv.appendChild(span);
      });

      panel.appendChild(metaDiv);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn mx-auto mt-2';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '<span>Cerrar</span> <span aria-hidden="true">✕</span>';
    panel.appendChild(closeBtn);

    fragment.appendChild(panel);

    this.root.innerHTML = '';
    this.root.appendChild(fragment);
    this.root.classList.add('active');
    this._isOpen = true;
  }

  close() {
    this.root.classList.remove('active');
    setTimeout(() => {
      this.root.innerHTML = '';
    }, 300);
    this._isOpen = false;
  }

  get isOpen() {
    return this._isOpen;
  }
}
