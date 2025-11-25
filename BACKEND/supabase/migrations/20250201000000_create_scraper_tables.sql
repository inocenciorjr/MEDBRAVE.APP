-- Migration: Create scraper_jobs and scraper_logs tables
-- Description: Tables for managing scraper batch jobs and execution logs
-- Date: 2025-02-01

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create scraper_jobs table
CREATE TABLE IF NOT EXISTS scraper_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_urls INTEGER NOT NULL,
  completed_urls INTEGER DEFAULT 0,
  failed_urls INTEGER DEFAULT 0,
  total_questions_extracted INTEGER DEFAULT 0,
  total_questions_saved INTEGER DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  missing_questions JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for scraper_jobs
CREATE INDEX idx_scraper_jobs_user_id ON scraper_jobs(user_id);
CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_created_at ON scraper_jobs(created_at DESC);

-- Create scraper_logs table
CREATE TABLE IF NOT EXISTS scraper_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES scraper_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  questions_extracted INTEGER DEFAULT 0,
  questions_saved INTEGER DEFAULT 0,
  missing_questions INTEGER[],
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  html_snapshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for scraper_logs
CREATE INDEX idx_scraper_logs_job_id ON scraper_logs(job_id);
CREATE INDEX idx_scraper_logs_status ON scraper_logs(status);
CREATE INDEX idx_scraper_logs_created_at ON scraper_logs(created_at DESC);

-- Add RLS policies for scraper_jobs
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own jobs
CREATE POLICY "Users can view their own scraper jobs"
  ON scraper_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own jobs
CREATE POLICY "Users can create their own scraper jobs"
  ON scraper_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own jobs
CREATE POLICY "Users can update their own scraper jobs"
  ON scraper_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own jobs
CREATE POLICY "Users can delete their own scraper jobs"
  ON scraper_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for scraper_logs
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their own jobs
CREATE POLICY "Users can view logs for their own scraper jobs"
  ON scraper_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scraper_jobs
      WHERE scraper_jobs.id = scraper_logs.job_id
      AND scraper_jobs.user_id = auth.uid()
    )
  );

-- Policy: System can insert logs (no user restriction)
CREATE POLICY "System can insert scraper logs"
  ON scraper_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE scraper_jobs IS 'Stores batch scraping jobs with status and results';
COMMENT ON TABLE scraper_logs IS 'Stores detailed logs for each URL processed in scraper jobs';

COMMENT ON COLUMN scraper_jobs.config IS 'Job configuration including URLs and options (JSONB)';
COMMENT ON COLUMN scraper_jobs.results IS 'Array of results per URL (JSONB)';
COMMENT ON COLUMN scraper_jobs.missing_questions IS 'Map of URL to missing question numbers (JSONB)';
COMMENT ON COLUMN scraper_logs.html_snapshot IS 'HTML snapshot of the page for debugging';
