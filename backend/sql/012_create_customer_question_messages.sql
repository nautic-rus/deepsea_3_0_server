-- Migration: create customer_question_messages table
CREATE TABLE IF NOT EXISTS customer_question_messages (
  id SERIAL PRIMARY KEY,
  customer_question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_question_messages_question_id ON customer_question_messages(customer_question_id);
CREATE INDEX IF NOT EXISTS idx_customer_question_messages_user_id ON customer_question_messages(user_id);
