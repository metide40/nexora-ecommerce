// NEXORA Product helpers
// The product list now comes from the Django backend (see js/api.js).
// These arrays start empty and are filled by API.loadCatalog().
const products = [];
const categories = [];

// Helper functions
function getProductById(id) {
  return products.find(p => p.id === parseInt(id));
}

function getProductsByCategory(category) {
  return products.filter(p => p.category === category);
}

function getFeaturedProducts() {
  return products.filter(p => p.featured);
}

function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}

function getDiscountPercent(product) {
  if (!product.originalPrice) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}
