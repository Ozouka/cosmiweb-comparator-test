if (!customElements.get('compare-button')) {
  class CompareButton extends HTMLElement {
    constructor() {
      super();
      this.handleClick = this.handleClick.bind(this);
      this.updateState = this.updateState.bind(this);
    }

    get productHandle() {
      return this.dataset.productHandle;
    }

    connectedCallback() {
      this._button = this.querySelector('button');
      this._label = this.querySelector('.comparator-button__label');

      if (!this._button) return;

      this._button.addEventListener('click', this.handleClick);
      window.addEventListener(ComparatorStore.EVENT_CHANGE, this.updateState);

      this.updateState();
    }

    disconnectedCallback() {
      if (this._button) {
        this._button.removeEventListener('click', this.handleClick);
      }
      window.removeEventListener(ComparatorStore.EVENT_CHANGE, this.updateState);
    }

    handleClick() {
      if (typeof ComparatorStore === 'undefined') return;

      if (ComparatorStore.hasProduct(this.productHandle)) {
        ComparatorStore.removeProduct(this.productHandle);
      } else {
        ComparatorStore.addProduct(this.productHandle);
      }
    }

    updateState() {
      if (!this._button || !this._label) return;
      if (typeof ComparatorStore === 'undefined') return;

      const isActive = ComparatorStore.hasProduct(this.productHandle);
      const isFull = ComparatorStore.isFull();

      this._button.classList.toggle('comparator-button--active', isActive);
      this._button.disabled = !isActive && isFull;
      this._button.setAttribute('aria-pressed', String(isActive));

      if (isActive) {
        this._label.textContent = this.dataset.labelActive || 'Ajouté';
      } else if (isFull) {
        this._label.textContent = this.dataset.labelFull || 'Maximum atteint (4)';
      } else {
        this._label.textContent = this.dataset.labelDefault || 'Comparer';
      }
    }
  }

  customElements.define('compare-button', CompareButton);
}
