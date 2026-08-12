-- Migration: add day75_email_sent_at to users table (ORC-83)
-- Tracks when the Day-75 pilot conversion email was sent to avoid duplicates
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS day75_email_sent_at TIMESTAMP;
