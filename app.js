const products = [
  ['shoe-sourcing', 'Shoe Sourcing Package', 7, 15, 'Launch Sale', 'Supplier contacts and marketplace links for shoe sourcing. Buyers should verify product details and authenticity directly with suppliers.'],
  ['clothing-sourcing', 'Clothing Sourcing Package', 7, 15, 'Launch Sale', 'Supplier contacts and sourcing links for apparel categories including hoodies, shorts, tee shirts, pants, and more.'],
  ['electronics-accessories-sourcing', 'Electronics Accessories Sourcing Package', 7, 15, 'Launch Sale', 'Supplier contacts and marketplace links for electronics accessory sourcing. Includes supplier info and direct buying links when available.'],
  ['fragrance-sourcing', 'Fragrance Sourcing Package', 7, 15, 'Launch Sale', 'Supplier contacts and marketplace links for fragrance sourcing. Includes contact info and notes about supplier offerings.'],
  ['all-sourcing-bundle', 'All Sourcing Bundle', 12, 15, 'Best Value', 'Get every sourcing category in one package. Best option for buyers who want access to all available sourcing resources.'],
];

const cart = new Map();
const grid = document.querySelector('#productGrid');
const drawer = document.querySelector('#cartDrawer');

grid.innerHTML = products.map(([id, name, price, compare, badge, description]) => `
  <article class="card">
    <div class="media"><span>${badge}</span></div>
    <h3>${name}</h3>
    <p>${description}</p>
    <div class="price"><strong>$${price}</strong><span>$${compare}</span><button data-add="${id}">Add</button></div>
  </article>
`).join('');

document.addEventListener('click', (event) => {
  const addId = event.target.dataset?.add;
  if (addId) {
    const product = products.find(([id]) => id === addId);
    cart.set(addId, product);
    renderCart();
    drawer.hidden = false;
  }
});

document.querySelector('#cartButton').addEventListener('click', () => drawer.hidden = false);
document.querySelector('#closeCart').addEventListener('click', () => drawer.hidden = true);

function renderCart() {
  const items = [...cart.values()];
  document.querySelector('#cartCount').textContent = items.length;
  document.querySelector('#cartItems').innerHTML = items.length
    ? items.map(([id, name, price]) => `<div class="cart-row"><span>${name}</span><strong>$${price}</strong><button onclick="removeItem('${id}')">Remove</button></div>`).join('')
    : '<p>Your cart is empty.</p>';
  document.querySelector('#cartTotal').textContent = `$${items.reduce((sum, item) => sum + item[2], 0)}`;
}

window.removeItem = (id) => {
  cart.delete(id);
  renderCart();
};
