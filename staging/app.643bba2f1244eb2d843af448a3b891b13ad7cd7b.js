import { resolveCartAdd } from "./cart-logic.643bba2f1244eb2d843af448a3b891b13ad7cd7b.js";

const products = [
  { id: "shoe-vendor", name: "Shoe Vendor", icon: "👟", price: 7, compareAt: 15, badge: "Launch Sale", description: "Supplier contacts and marketplace links for quality designer shoe sourcing." },
  { id: "clothes-vendor", name: "Clothes Vendor", icon: "🧥", price: 7, compareAt: 15, badge: "Launch Sale", description: "Vendor contacts and sourcing links for hoodies, shorts, tee shirts, pants, and more." },
  { id: "airpods-headphones-vendor", name: "AirPods / Headphones Vendor", icon: "🎧", price: 7, compareAt: 15, badge: "Launch Sale", description: "Supplier contacts and direct buying links for AirPods and headphones sourcing." },
  { id: "cologne-vendor", name: "Cologne Vendor", icon: "🧴", price: 7, compareAt: 15, badge: "Launch Sale", description: "Vendor contacts and marketplace links for cologne sourcing, with notes on each source." },
  { id: "all-vendor-bundle", name: "All Vendor Bundle", icon: "📦", price: 12, compareAt: 28, badge: "Best Value", isBundle: true, description: "Every vendor category in one package: shoes, clothes, AirPods/headphones, and cologne." }
];
const faqs = [
  ["How fast is delivery?", "Your vendor package will be emailed automatically within a few minutes of payment. Check spam, junk, and promotions if it does not arrive right away."],
  ["Do I need an account?", "No. Checkout is account-free. Use the email where you want the package delivered and save your confirmation email."],
  ["Does the bundle include everything?", "Yes. It includes shoes, clothes, AirPods/headphones, and cologne vendor categories."],
  ["Can I get a refund?", "Because these are digital products, all sales are final after delivery. Contact support for an unresolved delivery problem, duplicate charge, or incorrect package."],
  ["Are you affiliated with brands or suppliers?", "No. ResaleLane sells informational resources and is not affiliated with or endorsed by any third-party brand, marketplace, manufacturer, or supplier."]
];
const bundleId = "all-vendor-bundle";
let cart = JSON.parse(localStorage.getItem("resalelane-cart") || "[]").filter(id => products.some(p => p.id === id));
let conflict = null;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const product = id => products.find(item => item.id === id);
const money = value => `$${value}`;

function init() {
  $("[data-preview-list]").innerHTML = products.filter(p => !p.isBundle).map(p => `<div class="preview-item"><span>${p.icon}</span><b>${p.name}</b><s>$15</s></div>`).join("");
  $("[data-product-grid]").innerHTML = products.filter(p => !p.isBundle).map(p => `<article class="product-card"><div class="product-top"><span class="product-icon">${p.icon}</span><span class="badge">${p.badge}</span></div><h3>${p.name}</h3><p>${p.description}</p><div class="price"><strong>${money(p.price)}</strong><s>${money(p.compareAt)}</s></div><button class="button primary" data-add="${p.id}">Add to Cart</button><button class="text-button" data-detail="${p.id}">View Details</button></article>`).join("");
  $("[data-faq-list]").innerHTML = faqs.map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join("");
  document.addEventListener("click", handleClick);
  $("[data-contact-form]").addEventListener("submit", sendContact);
  updateCart();
}

function handleClick(event) {
  const add = event.target.closest("[data-add]");
  const detail = event.target.closest("[data-detail]");
  if (add) addToCart(add.dataset.add);
  if (detail) openDetail(detail.dataset.detail);
  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();
  if (event.target.matches("[data-cart-overlay]")) closeCart();
  if (event.target.closest("[data-open-menu]")) toggleMenu(true);
  if (event.target.closest("[data-close-menu]") || event.target.matches("[data-mobile-menu]") || event.target.closest(".mobile-menu a")) toggleMenu(false);
  if (event.target.closest("[data-close-modal]") || event.target.matches("[data-modal-overlay]")) closeModal();
  if (event.target.closest("[data-remove]")) removeItem(event.target.closest("[data-remove]").dataset.remove);
  if (event.target.closest("[data-checkout]")) openCheckout();
  if (event.target.closest("[data-keep-bundle]")) { cart = [bundleId]; conflict = null; updateCart(); }
  if (event.target.closest("[data-keep-all]")) { conflict = null; updateCart(); }
  if (event.target.closest("[data-add-anyway]")) { cart.push(conflict.pendingId); conflict = null; updateCart(); }
  if (event.target.closest("[data-bundle-link]")) {
    const panel = $("[data-bundle-panel]"); panel.classList.remove("pulse"); requestAnimationFrame(() => panel.classList.add("pulse")); setTimeout(() => panel.classList.remove("pulse"), 2400);
  }
}

function addToCart(id) {
  const result = resolveCartAdd(cart, id, bundleId);
  cart = result.cart;
  conflict = result.conflict;
  updateCart(); openCart();
  if (result.status === "duplicate") toast("Already in cart");
  else if (!conflict) toast("Added to cart");
}

function removeItem(id) { cart = cart.filter(item => item !== id); conflict = null; updateCart(); }
function updateCart() {
  localStorage.setItem("resalelane-cart", JSON.stringify(cart));
  $$(".cart-count").forEach(el => { el.textContent = cart.length; el.hidden = !cart.length; });
  const items = cart.map(product);
  $("[data-cart-content]").innerHTML = items.length ? items.map(p => `<div class="cart-item"><span class="cart-item-icon">${p.icon}</span><div><h3>${p.name}</h3><button data-remove="${p.id}">Remove</button></div><strong>${money(p.price)}</strong></div>`).join("") : `<div class="empty-cart"><h3>Your cart is empty</h3><p>Choose a vendor package to get started.</p></div>`;
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);
  $("[data-cart-footer]").innerHTML = items.length ? `<div class="subtotal"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><p class="reassurance">Digital delivery by email<br>Secure Stripe checkout (setup pending)</p>${conflictMarkup()}<button class="button primary" data-checkout>Checkout Securely</button>` : `<button class="button secondary" data-close-cart>Continue Shopping</button>`;
}
function conflictMarkup() {
  if (!conflict) return "";
  if (conflict.type === "bundle") return `<div class="conflict"><p>Your cart has the bundle and individual packages. Which would you like to keep?</p><button class="button primary" data-keep-bundle>Keep Bundle Only</button><button class="button secondary" data-keep-all>Keep Everything</button></div>`;
  return `<div class="conflict"><p>The bundle already includes this vendor. Do you still want both?</p><button class="button primary" data-keep-bundle>Keep Bundle Only</button><button class="button secondary" data-add-anyway>Add Anyway</button></div>`;
}
function openCart() { $("[data-cart-overlay]").hidden = false; document.body.classList.add("locked"); }
function closeCart() { $("[data-cart-overlay]").hidden = true; conflict = null; updateCart(); document.body.classList.remove("locked"); }
function toggleMenu(open) { $("[data-mobile-menu]").hidden = !open; document.body.classList.toggle("locked", open); }

function openDetail(id) {
  const p = product(id);
  $("[data-modal]").innerHTML = `<div class="modal-heading"><div class="modal-product"><span class="product-icon">${p.icon}</span><div><span class="badge">${p.badge}</span><h2>${p.name}</h2></div></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div><div class="price"><strong>${money(p.price)}</strong><s>${money(p.compareAt)}</s></div><p class="description">${p.description}</p><p class="modal-label">WHAT YOU GET</p><ul class="check-list"><li>Supplier contact details when available</li><li>Marketplace links when available</li><li>Notes about what each source is best for</li><li>Email delivery after checkout</li></ul><p class="modal-label">HOW DELIVERY WORKS</p><p class="legal">Your package is delivered to your checkout email. No account is required. Save your confirmation email as your order record.</p><p class="modal-label">BEFORE YOU BUY</p><p class="legal">ResaleLane sells informational resources only and is not affiliated with any brand or supplier. Verify all third-party details before buying.</p><button class="button primary" data-add="${p.id}" data-close-modal>${p.isBundle ? "Add Bundle to Cart" : "Add to Cart"}</button>`;
  openModal();
}
function openCheckout() {
  const items = cart.map(product), subtotal = items.reduce((sum, p) => sum + p.price, 0);
  closeCart();
  $("[data-modal]").innerHTML = `<div class="modal-heading"><h2>Checkout</h2><button class="icon-button" data-close-modal aria-label="Close">×</button></div><p class="modal-label">ORDER SUMMARY</p><div class="checkout-summary">${items.map(p => `<div class="checkout-line"><span>${p.name}</span><strong>${money(p.price)}</strong></div>`).join("")}<div class="checkout-total"><span>Subtotal</span><strong>${money(subtotal)}</strong></div></div><label class="modal-label">DELIVERY EMAIL<input type="email" placeholder="you@email.com" /></label><button class="button disabled" disabled>Continue to Stripe (Setup Pending)</button><p class="legal">Payments are not active yet. This button will open secure Stripe Checkout after Collin connects a Stripe account.</p>`;
  openModal();
}
function openModal() { $("[data-modal-overlay]").hidden = false; document.body.classList.add("locked"); }
function closeModal() { $("[data-modal-overlay]").hidden = true; document.body.classList.remove("locked"); }
function toast(message) { const el = $("[data-toast]"); el.textContent = message; el.hidden = false; clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.hidden = true, 1800); }
function sendContact(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`ResaleLane support: ${data.get("reason")}`);
  const body = encodeURIComponent(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\nOrder ID: ${data.get("order") || "N/A"}\n\n${data.get("message")}`);
  window.location.href = `mailto:collin.bediner+support@gmail.com?subject=${subject}&body=${body}`;
  toast("Opening your email app");
}
init();
