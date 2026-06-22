import { resolveCartAdd } from "./cart-logic.e21a37a72d65fbcb0db74c724f2afd8dca9b6cba.js";

const products = [
  { id: "shoe-vendor", name: "Shoe Vendor", icon: "👟", price: 7, compareAt: 15, badge: "Launch Sale", description: "Digital supplier information and marketplace links for shoe sourcing research." },
  { id: "clothes-vendor", name: "Clothes Vendor", icon: "🧥", price: 7, compareAt: 15, badge: "Launch Sale", description: "Digital supplier information and sourcing links for apparel research." },
  { id: "airpods-headphones-vendor", name: "AirPods / Headphones Vendor", icon: "🎧", price: 7, compareAt: 15, badge: "Launch Sale", description: "Digital supplier information and marketplace links for headphone and accessory research." },
  { id: "cologne-vendor", name: "Cologne Vendor", icon: "🧴", price: 7, compareAt: 15, badge: "Launch Sale", description: "Digital supplier information and marketplace links for fragrance sourcing research." },
  { id: "all-vendor-bundle", name: "All Vendor Bundle", icon: "📦", price: 12, compareAt: 28, badge: "Best Value", isBundle: true, description: "Digital sourcing information for every category: shoes, clothes, AirPods/headphones, and cologne." }
];
const faqs = [
  ["What does ResaleLane sell?", "ResaleLane sells digital sourcing information, such as supplier details and marketplace links. We do not sell or ship physical products."],
  ["How fast is delivery?", "After checkout and fulfillment are activated, your digital resource will be emailed after verified payment. Check spam, junk, and promotions if it does not arrive."],
  ["Do I need an account?", "No. Checkout is account-free. Use the email where you want the package delivered and save your confirmation email."],
  ["Does the bundle include everything?", "Yes. It includes shoes, clothes, AirPods/headphones, and cologne vendor categories."],
  ["Do supplier details stay the same?", "Not always. Third-party contacts, links, prices, stock, shipping, and policies can change. Check the latest details directly with each supplier before buying."],
  ["What does ResaleLane guarantee?", "ResaleLane does not guarantee authenticity, quality, pricing, inventory, shipping, supplier reliability, or resale profit. The information is a starting point for your own research."],
  ["Can I get a refund?", "All sales are final after digital delivery. Support may review a duplicate charge, wrong package, or unresolved non-delivery. Changes made by a third-party supplier are not guaranteed refund reasons."],
  ["Are you affiliated with brands or suppliers?", "No. ResaleLane is not affiliated with or endorsed by any third-party brand, marketplace, manufacturer, or supplier."]
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
  $("[data-cart-footer]").innerHTML = items.length ? `<div class="subtotal"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><p class="reassurance">Digital sourcing information only<br>Stripe checkout is not active yet</p>${conflictMarkup()}<button class="button primary" data-checkout>Checkout Securely</button>` : `<button class="button secondary" data-close-cart>Continue Shopping</button>`;
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
  $("[data-modal]").innerHTML = `<div class="modal-heading"><div class="modal-product"><span class="product-icon">${p.icon}</span><div><span class="badge">${p.badge}</span><h2>${p.name}</h2></div></div><button class="icon-button" data-close-modal aria-label="Close">×</button></div><div class="price"><strong>${money(p.price)}</strong><s>${money(p.compareAt)}</s></div><p class="description">${p.description}</p><p class="modal-label">WHAT YOU GET</p><ul class="check-list"><li>Digital supplier information when available</li><li>Third-party marketplace links when available</li><li>Notes to support your own sourcing research</li><li>Email delivery after verified payment</li></ul><p class="modal-label">HOW DELIVERY WORKS</p><p class="legal">Your digital resource will be delivered to your checkout email after payment and fulfillment are activated. No physical product is included.</p><p class="modal-label">BEFORE YOU BUY</p><p class="legal">Supplier details can change. ResaleLane does not control third parties or guarantee authenticity, pricing, stock, quality, shipping, reliability, or resale results. Verify everything yourself before purchasing.</p><button class="button primary" data-add="${p.id}" data-close-modal>${p.isBundle ? "Add Bundle to Cart" : "Add to Cart"}</button>`;
  openModal();
}
function openCheckout() {
  const items = cart.map(product), subtotal = items.reduce((sum, p) => sum + p.price, 0);
  closeCart();
  $("[data-modal]").innerHTML = `<div class="modal-heading"><h2>Checkout</h2><button class="icon-button" data-close-modal aria-label="Close">×</button></div><p class="modal-label">ORDER SUMMARY</p><div class="checkout-summary">${items.map(p => `<div class="checkout-line"><span>${p.name}</span><strong>${money(p.price)}</strong></div>`).join("")}<div class="checkout-total"><span>Subtotal</span><strong>${money(subtotal)}</strong></div></div><label class="modal-label">DELIVERY EMAIL<input type="email" placeholder="you@email.com" /></label><button class="button disabled" disabled>Continue to Stripe (Setup Pending)</button><p class="legal">Payments are not active. When checkout launches, you will be buying digital sourcing information, not a physical product. All sales will be final after delivery except reviewed duplicate-charge, wrong-delivery, or unresolved non-delivery cases.</p>`;
  openModal();
}
function openModal() { $("[data-modal-overlay]").hidden = false; document.body.classList.add("locked"); }
function closeModal() { $("[data-modal-overlay]").hidden = true; document.body.classList.remove("locked"); }
function toast(message) { const el = $("[data-toast]"); el.textContent = message; el.hidden = false; clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.hidden = true, 1800); }
async function sendContact(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = $("[data-contact-status]");
  const data = Object.fromEntries(new FormData(form));

  button.disabled = true;
  button.textContent = "Sending...";
  status.className = "form-status";
  status.textContent = "Sending your message securely...";

  try {
    const response = await fetch("https://api.shopresalelane.com/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Your message could not be sent.");

    form.reset();
    status.className = "form-status success";
    status.textContent = `Message sent. Your support reference is ${result.requestId}.`;
    toast("Message sent");
  } catch (error) {
    status.className = "form-status error";
    status.textContent = `${error.message} You can also email collin.bediner+support@gmail.com.`;
  } finally {
    button.disabled = false;
    button.textContent = "Send message";
  }
}
init();
