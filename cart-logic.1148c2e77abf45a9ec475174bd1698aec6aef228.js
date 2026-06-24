export function resolveCartAdd(currentCart, id, bundleId) {
  const cart = [...currentCart];

  if (cart.includes(id)) {
    return { cart, conflict: null, status: "duplicate" };
  }

  if (id === bundleId) {
    cart.push(id);
    return {
      cart,
      conflict: cart.some(item => item !== bundleId) ? { type: "bundle" } : null,
      status: "added"
    };
  }

  if (cart.includes(bundleId)) {
    return {
      cart,
      conflict: { type: "individual", pendingId: id },
      status: "conflict"
    };
  }

  cart.push(id);
  return { cart, conflict: null, status: "added" };
}
