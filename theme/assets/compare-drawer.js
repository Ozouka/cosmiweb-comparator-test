if (!customElements.get('compare-drawer')) {
  class CompareDrawer extends HTMLElement {
    constructor() {
      super();
      this.update = this.update.bind(this);
      this.productsCache = new Map();
    }

    get productsContainer() {
      return this.querySelector('.comparator-drawer__products');
    }

    get countBadge() {
      return this.querySelector('.comparator-drawer__count');
    }

    connectedCallback() {
      if (
        window.location.pathname === '/pages/comparaison'
      ) {
        return;
      }
      if(window.URL)
        window.addEventListener(ComparatorStore.EVENT_CHANGE, this.update);
      this.addEventListener('click', this.handleClick.bind(this));
      this.update();
 
    }

    disconnectedCallback() {
      window.removeEventListener(ComparatorStore.EVENT_CHANGE, this.update);
    }

    handleClick(event) {
      const removeBtn = event.target.closest('[data-remove-handle]');
      if (removeBtn) {
        ComparatorStore.removeProduct(removeBtn.dataset.removeHandle);
      }
    }

    async update() {
      const handles = ComparatorStore.getProducts();

      if (handles.length === 0) {
        this.classList.remove('is-visible');
        return;
      }

      this.classList.add('is-visible');
      this.countBadge.textContent = handles.length;

      const products = await this.fetchProducts(handles);
      this.renderProducts(products);
    }

    async fetchProducts(handles) {
      const uncached = handles.filter((h) => !this.productsCache.has(h));

      if (uncached.length > 0) {
        let fetchedFromProxy = false;

        try {
          const productsUrl = this.dataset.productsUrl;
          const response = await fetch(`${productsUrl}?handles=${uncached.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            if (data.products && Array.isArray(data.products)) {
              data.products.forEach((product) => {
                this.productsCache.set(product.handle, product);
              });
              fetchedFromProxy = true;
            }
          }
        } catch {
          // App Proxy unavailable
        }

        if (!fetchedFromProxy) {
          for (const handle of uncached) {
            try {
              const res = await fetch(`/products/${handle}.js`);
              if (res.ok) {
                const product = await res.json();
                this.productsCache.set(handle, {
                  handle: product.handle,
                  title: product.title,
                  image: product.featured_image || '',
                });
              }
            } catch {
              // Skip unavailable products
            }
          }
        }
      }

      return handles
        .map((h) => this.productsCache.get(h))
        .filter(Boolean);
    }

    renderProducts(products) {
      this.productsContainer.innerHTML = products
        .map(
          (product) => `
          <div class="comparator-drawer__product">
            ${product.image ? `<img
              class="comparator-drawer__product-image"
              src="${product.image}"
              alt="${this.escapeHtml(product.title)}"
              width="48"
              height="48"
              loading="lazy"
            >` : ''}
            <span class="comparator-drawer__product-title">${this.escapeHtml(product.title)}</span>
            <button
              type="button"
              class="comparator-drawer__remove"
              data-remove-handle="${product.handle}"
              aria-label="Retirer ${this.escapeHtml(product.title)} de la comparaison"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        `
        )
        .join('');
    }

    escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  customElements.define('compare-drawer', CompareDrawer);
}
