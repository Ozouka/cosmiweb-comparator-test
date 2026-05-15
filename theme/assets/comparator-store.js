if (!window.ComparatorStore) {
class ComparatorStore {
  static STORAGE_KEY = 'comparator_products';
  static MAX_PRODUCTS = 4;
  static EVENT_CHANGE = 'comparator:change';

  static getProducts() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  static setProducts(products) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(
      new CustomEvent(this.EVENT_CHANGE, { detail: { products } })
    );
  }

  static addProduct(handle) {
    const products = this.getProducts();
    if (products.length >= this.MAX_PRODUCTS || products.includes(handle)) return false;
    products.push(handle);
    this.setProducts(products);
    return true;
  }

  static removeProduct(handle) {
    const products = this.getProducts().filter((h) => h !== handle);
    this.setProducts(products);
  }

  static hasProduct(handle) {
    return this.getProducts().includes(handle);
  }

  static isFull() {
    return this.getProducts().length >= this.MAX_PRODUCTS;
  }

  static getCount() {
    return this.getProducts().length;
  }

  static clear() {
    this.setProducts([]);
  }
}

window.ComparatorStore = ComparatorStore;
}
