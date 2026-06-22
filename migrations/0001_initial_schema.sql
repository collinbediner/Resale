PRAGMA foreign_keys = ON;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  buyer_email TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  amount_total INTEGER NOT NULL CHECK (amount_total >= 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'processing', 'delivered', 'failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  unit_amount INTEGER NOT NULL CHECK (unit_amount >= 0),
  artifact_version TEXT,
  UNIQUE (order_id, product_id)
);

CREATE TABLE payment_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  failure_category TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT
);

CREATE TABLE delivery_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  artifact_version TEXT,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  failure_category TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE (order_id, attempt_number)
);

CREATE TABLE support_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'open'
    CHECK (request_status IN ('open', 'in_progress', 'resolved', 'closed')),
  resend_outcome TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_buyer_email ON orders(buyer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_delivery_attempts_order_id ON delivery_attempts(order_id);
CREATE INDEX idx_support_requests_order_id ON support_requests(order_id);
CREATE INDEX idx_support_requests_status ON support_requests(request_status);
