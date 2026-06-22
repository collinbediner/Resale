ALTER TABLE orders ADD COLUMN retention_expires_at TEXT;
ALTER TABLE orders ADD COLUMN anonymized_at TEXT;
ALTER TABLE support_requests ADD COLUMN retention_expires_at TEXT;
ALTER TABLE support_requests ADD COLUMN anonymized_at TEXT;

CREATE INDEX idx_orders_fulfillment_status
  ON orders(fulfillment_status, updated_at);
CREATE INDEX idx_payment_events_processing_status
  ON payment_events(processing_status, received_at);
CREATE INDEX idx_delivery_attempts_status
  ON delivery_attempts(delivery_status, created_at);
CREATE INDEX idx_orders_retention
  ON orders(retention_expires_at, anonymized_at);
CREATE INDEX idx_support_requests_retention
  ON support_requests(retention_expires_at, anonymized_at);
