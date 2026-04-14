ALTER TABLE "commercial_submissions"
  ADD COLUMN IF NOT EXISTS "email_thread_id" integer
    REFERENCES "email_threads"("id") ON DELETE SET NULL;
