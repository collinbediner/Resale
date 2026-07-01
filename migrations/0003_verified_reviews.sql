CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  headline TEXT,
  review_text TEXT NOT NULL,
  display_name TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id, buyer_email)
);

CREATE INDEX idx_reviews_status_created_at ON reviews(review_status, created_at);
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
