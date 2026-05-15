if (!customElements.get('compare-page')) {
  class ComparePage extends HTMLElement {
    constructor() {
      super();
      this.products = [];
      this.tracked = false;
    }

    connectedCallback() {
      this._tableWrapper = this.querySelector('.compare-page__table-wrapper');
      this._emptyState = this.querySelector('.compare-page__empty');
      this._clearButton = this.querySelector('.compare-page__clear');
      this._loadingState = this.querySelector('.compare-page__loading');

      this._clearButton.addEventListener('click', () => {
        ComparatorStore.clear();
        this.products = [];
        this.tracked = false;
        this.render();
      });

      window.addEventListener(ComparatorStore.EVENT_CHANGE, () => {
        this.products = [];
        this.tracked = false;
        this.render();
      });

      this.render();
    }

    async render() {
      const handles = ComparatorStore.getProducts();

      if (handles.length === 0) {
        this.showEmpty();
        return;
      }

      this.showLoading();

      try {
        const [config, products] = await Promise.all([
          this.fetchConfig(),
          this.fetchProducts(handles),
        ]);

        this.products = products;

        if (products.length === 0) {
          this.showEmpty();
          return;
        }

        this.renderTable(config);
        this.trackComparison();
      } catch (err) {
        console.error('[Comparator] Render error:', err);
        this._tableWrapper.innerHTML = `
          <div class="compare-page__error">
            <p>Une erreur est survenue lors du chargement des produits.</p>
            <button type="button" class="button button--secondary" onclick="location.reload()">Réessayer</button>
          </div>
        `;
        this.hideAll();
        this._clearButton.classList.remove('hidden');
      }
    }

    showEmpty() {
      this._tableWrapper.innerHTML = '';
      this.hideAll();
      this._emptyState.classList.remove('hidden');
    }

    showLoading() {
      this._tableWrapper.innerHTML = '';
      this.hideAll();
      this._loadingState.classList.remove('hidden');
    }

    hideAll() {
      this._emptyState.classList.add('hidden');
      this._clearButton.classList.add('hidden');
      this._loadingState.classList.add('hidden');
    }

    async fetchConfig() {
      const configUrl = this.dataset.configUrl;
      try {
        const response = await fetch(configUrl);
        console.log('[Comparator] Config response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[Comparator] Config data:', JSON.stringify(data));
          if (data && data.fields) return data;
        }
      } catch (err) {
        console.warn('[Comparator] Config fetch failed, using defaults:', err);
      }

      return {
        fields: [
          { key: 'price', label: 'Prix', enabled: true, order: 0 },
          { key: 'description', label: 'Description', enabled: true, order: 1 },
          { key: 'variants', label: 'Variantes', enabled: true, order: 2 },
          { key: 'stock', label: 'Disponibilité', enabled: true, order: 3 },
          { key: 'weight', label: 'Poids', enabled: false, order: 4 },
        ],
      };
    }

    async fetchProducts(handles) {
      const productsUrl = this.dataset.productsUrl;

      try {
        const response = await fetch(`${productsUrl}?handles=${handles.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          if (data.products && data.products.length > 0) return data.products;
        }
      } catch (err) {
        console.warn('[Comparator] App Proxy products fetch failed, using fallback:', err);
      }

      const products = [];
      for (const handle of handles) {
        try {
          const res = await fetch(`/products/${handle}.js`);
          if (res.ok) products.push(await res.json());
        } catch {
        }
      }
      return products;
    }

    async trackComparison() {
      if (this.tracked || this.products.length < 2) return;
      this.tracked = true;

      const trackUrl = this.dataset.trackUrl;
      const products = this.products.map((p) => ({
        id: String(p.id),
        title: p.title || '',
        image: p.featured_image || (p.images && p.images[0]) || '',
      }));

      try {
        await fetch(trackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products }),
        });
      } catch (err) {
        console.warn('[Comparator] Track failed:', err);
      }
    }

    renderTable(config) {
      const fields = config.fields
        .filter((f) => f.enabled)
        .sort((a, b) => a.order - b.order);

      const products = this.products;

      let html = '<table class="compare-table">';

      html += '<thead><tr class="compare-table__row compare-table__row--header">';
      html += '<th class="compare-table__label"></th>';
      products.forEach((product) => {
        const image = product.featured_image || (product.images && product.images[0]) || '';
        html += `
          <th class="compare-table__cell compare-table__cell--header">
            ${image ? `<img class="compare-table__product-image" src="${this.resizeImage(image, 300)}" alt="${this.esc(product.title)}" width="300" height="300" loading="lazy">` : '<div class="compare-table__product-image compare-table__product-image--placeholder"></div>'}
            <span class="compare-table__product-title">${this.esc(product.title)}</span>
          </th>
        `;
      });
      html += '</tr></thead>';

      html += '<tbody>';
      fields.forEach((field) => {
        const values = products.map((p) => this.getFieldValue(p, field.key));
        const displayValues = products.map((p) => this.getFieldDisplay(p, field.key));
        const allIdentical = this.areAllIdentical(values);
        const rowClass = allIdentical ? 'compare-table__row--identical' : '';

        html += `<tr class="compare-table__row ${rowClass}">`;
        html += `<td class="compare-table__label">${this.esc(field.label)}${allIdentical ? ' <span class="compare-table__badge">Identique</span>' : ''}</td>`;
        products.forEach((_, index) => {
          const isHighlighted = !allIdentical && this.isHighlightValue(values, index, field.key);
          const cellClass = isHighlighted ? 'compare-table__cell--highlight' : '';
          html += `<td class="compare-table__cell ${cellClass}">${displayValues[index]}</td>`;
        });
        html += '</tr>';
      });

      html += `<tr class="compare-table__row compare-table__row--actions">`;
      html += '<td class="compare-table__label"></td>';
      products.forEach((product) => {
        const variantId = product.variants && product.variants[0] ? product.variants[0].id : '';
        const available = product.available !== false;
        html += `
          <td class="compare-table__cell compare-table__cell--action">
            <form action="/cart/add" method="post">
              <input type="hidden" name="id" value="${variantId}">
              <button type="submit" class="compare-table__add-to-cart button" ${available ? '' : 'disabled'}>
                ${available ? 'Ajouter au panier' : 'Indisponible'}
              </button>
            </form>
          </td>
        `;
      });
      html += '</tr>';

      html += '</tbody></table>';

      this._tableWrapper.innerHTML = html;
      this.hideAll();
      this._clearButton.classList.remove('hidden');
    }

    getFieldValue(product, key) {
      switch (key) {
        case 'price':
          return product.price;
        case 'description':
          return product.description || '';
        case 'variants':
          return (product.variants || []).map((v) => v.title).filter((t) => t !== 'Default Title').join(', ');
        case 'stock':
          return product.available ? 'available' : 'unavailable';
        case 'weight':
          return product.variants && product.variants[0] ? product.variants[0].weight : 0;
        case 'metafield':
          return product.metafield || '';
        default:
          return '';
      }
    }

    getFieldDisplay(product, key) {
      switch (key) {
        case 'price': {
          const price = this.formatMoney(product.price);
          const compareAt = product.compare_at_price;
          if (compareAt && compareAt > product.price) {
            return `<span class="compare-table__price--sale">${price}</span> <s class="compare-table__price--compare">${this.formatMoney(compareAt)}</s>`;
          }
          return price;
        }
        case 'description': {
          const desc = product.description || '';
          return desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
        }
        case 'variants': {
          const variants = (product.variants || [])
            .filter((v) => v.title !== 'Default Title')
            .map((v) => `<span class="compare-table__variant-tag">${this.esc(v.title)}</span>`);
          return variants.length > 0 ? variants.join(' ') : '<span class="compare-table__muted">—</span>';
        }
        case 'stock': {
          if (product.available) {
            return '<span class="compare-table__stock--in">En stock</span>';
          }
          return '<span class="compare-table__stock--out">Rupture de stock</span>';
        }
        case 'weight': {
          const variant = product.variants && product.variants[0];
          if (variant && variant.weight > 0) {
            return `${variant.weight} ${variant.weight_unit || 'g'}`;
          }
          return '<span class="compare-table__muted">—</span>';
        }
        default:
          return '<span class="compare-table__muted">—</span>';
      }
    }

    areAllIdentical(values) {
      if (values.length <= 1) return false;
      const normalized = values.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)));
      return normalized.every((v) => v === normalized[0]);
    }

    isHighlightValue(values, index, key) {
      if (key !== 'price') return false;
      const prices = values.map(Number).filter((p) => !isNaN(p));
      if (prices.length < 2) return false;
      const minPrice = Math.min(...prices);
      return Number(values[index]) === minPrice;
    }

    formatMoney(cents) {
      if (typeof cents === 'undefined' || cents === null) return '—';
      const amount = (Number(cents) / 100).toFixed(2);
      return `${amount} ${window.Shopify?.currency?.active || '€'}`;
    }

    resizeImage(src, size) {
      if (!src) return '';
      if (typeof src === 'object' && src.src) src = src.src;
      if (typeof src !== 'string') return '';
      return src.replace(/(\.\w+)(\?|$)/, `_${size}x$1$2`);
    }

    esc(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  customElements.define('compare-page', ComparePage);
}
