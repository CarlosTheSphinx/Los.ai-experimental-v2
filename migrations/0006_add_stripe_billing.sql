-- Migration: add Stripe billing fields to users table (ORC-51)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS founding_discount_rate NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
