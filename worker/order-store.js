const PAYMENT_TRANSITIONS = {
  pending: new Set(["paid", "failed"]),
  paid: new Set(["refunded"]),
  failed: new Set(["paid"]),
  refunded: new Set()
};

const FULFILLMENT_TRANSITIONS = {
  pending: new Set(["processing"]),
  processing: new Set(["delivered", "failed"]),
  failed: new Set(["processing"]),
  delivered: new Set()
};

// Explicit transition rules make retries safer because duplicate events cannot
// silently skip to impossible payment or fulfillment states.
export function canTransition(type, from, to) {
  const transitions = type === "payment" ? PAYMENT_TRANSITIONS : FULFILLMENT_TRANSITIONS;
  return from === to || Boolean(transitions[from]?.has(to));
}

export function requireTransition(type, from, to) {
  if (!canTransition(type, from, to)) {
    throw new Error(`Invalid ${type} transition: ${from} -> ${to}`);
  }
}

export async function claimStripeEvent(db, event) {
  const result = await db.prepare(`
    INSERT OR IGNORE INTO payment_events
      (stripe_event_id, event_type, processing_status)
    VALUES (?, ?, 'received')
  `).bind(event.id, event.type).run();

  return result.meta.changes === 1;
}

// Create the order and its line items together so partial writes do not leave an
// orphaned order record behind.
export async function createOrder(db, order) {
  if (!order.items?.length) throw new Error("Order requires at least one item");

  const statements = [
    db.prepare(`
      INSERT INTO orders (
        id, environment, stripe_checkout_session_id, stripe_payment_intent_id,
        buyer_email, currency, amount_total, payment_status, fulfillment_status,
        retention_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 months'))
    `).bind(
      order.id,
      order.environment,
      order.checkoutSessionId,
      order.paymentIntentId || null,
      order.buyerEmail.trim().toLowerCase(),
      order.currency,
      order.amountTotal,
      order.paymentStatus,
      "pending"
    ),
    ...order.items.map(item => db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_amount, artifact_version)
      VALUES (?, ?, 1, ?, ?)
    `).bind(order.id, item.productId, item.unitAmount, item.artifactVersion || null))
  ];

  await db.batch(statements);
}

export async function updateOrderState(db, orderId, current, next) {
  requireTransition("payment", current.payment, next.payment);
  requireTransition("fulfillment", current.fulfillment, next.fulfillment);

  return db.prepare(`
    UPDATE orders
    SET payment_status = ?, fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND payment_status = ? AND fulfillment_status = ?
  `).bind(
    next.payment,
    next.fulfillment,
    orderId,
    current.payment,
    current.fulfillment
  ).run();
}

export async function createDeliveryAttempt(db, attempt) {
  // Generate attempt numbers inside SQLite so concurrent retries still get a clean
  // increasing sequence for the same order.
  return db.prepare(`
    INSERT INTO delivery_attempts (
      id, order_id, attempt_number, artifact_version, delivery_status
    )
    SELECT ?, ?, COALESCE(MAX(attempt_number), 0) + 1, ?, 'pending'
    FROM delivery_attempts
    WHERE order_id = ?
    RETURNING attempt_number
  `).bind(attempt.id, attempt.orderId, attempt.artifactVersion || null, attempt.orderId).first();
}

export async function finishDeliveryAttempt(db, attemptId, result) {
  if (!["sent", "failed"].includes(result.status)) {
    throw new Error("Delivery attempt must finish as sent or failed");
  }

  return db.prepare(`
    UPDATE delivery_attempts
    SET delivery_status = ?, provider_message_id = ?, failure_category = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND delivery_status = 'pending'
  `).bind(
    result.status,
    result.providerMessageId || null,
    result.failureCategory || null,
    attemptId
  ).run();
}

export async function finishStripeEvent(db, eventId, status, orderId = null, failureCategory = null) {
  if (!["processed", "ignored", "failed"].includes(status)) {
    throw new Error("Invalid Stripe event completion status");
  }

  return db.prepare(`
    UPDATE payment_events
    SET processing_status = ?, order_id = ?, failure_category = ?,
        processed_at = CURRENT_TIMESTAMP
    WHERE stripe_event_id = ? AND processing_status = 'received'
  `).bind(status, orderId, failureCategory, eventId).run();
}
