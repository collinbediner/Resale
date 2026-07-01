function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOrderId(value) {
  return String(value || "").trim().toUpperCase();
}

function optionalTrimmed(value, maxLength) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.length > maxLength) {
    throw new Error(`Please keep that field under ${maxLength} characters.`);
  }
  return trimmed;
}

export function validateReviewSubmission(input) {
  const orderId = normalizeOrderId(input?.orderId);
  if (!/^RL-[A-Z0-9]{6,}$/.test(orderId)) {
    return { ok: false, error: "Enter the ResaleLane order ID from your delivery email." };
  }

  const buyerEmail = normalizeEmail(input?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return { ok: false, error: "Enter the same checkout email used for your order." };
  }

  const rating = Number.parseInt(String(input?.rating ?? ""), 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose a rating between 1 and 5 stars." };
  }

  let headline = "";
  let displayName = "";
  let reviewText = "";
  try {
    headline = optionalTrimmed(input?.headline, 80);
    displayName = optionalTrimmed(input?.displayName, 60);
    reviewText = optionalTrimmed(input?.reviewText, 1200);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  if (reviewText.length < 20) {
    return { ok: false, error: "Write at least 20 characters about your experience." };
  }

  return {
    ok: true,
    submission: {
      orderId,
      buyerEmail,
      rating,
      headline,
      displayName,
      reviewText
    }
  };
}

export async function verifyReviewBuyer(db, submission) {
  return db.prepare(`
    SELECT id
    FROM orders
    WHERE id = ?
      AND buyer_email = ?
      AND payment_status = 'paid'
      AND fulfillment_status = 'delivered'
  `).bind(submission.orderId, submission.buyerEmail).first();
}

export async function createReviewSubmission(db, review) {
  return db.prepare(`
    INSERT INTO reviews (
      id, order_id, buyer_email, rating, headline, review_text, display_name, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    review.id,
    review.orderId,
    review.buyerEmail,
    review.rating,
    review.headline || null,
    review.reviewText,
    review.displayName || null
  ).run();
}
