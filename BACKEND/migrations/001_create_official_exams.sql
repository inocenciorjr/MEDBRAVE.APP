-- Migration: Create official_exams table and modify simulated_exams
-- Description: Adds support for official exams (master templates) that can be used to create multiple user attempts

-- Create official_exams table
CREATE TABLE IF NOT EXISTS official_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identificação da prova
  exam_name VARCHAR(255) NOT NULL,
  exam_year INTEGER NOT NULL,
  exam_edition VARCHAR(100),
  institution VARCHAR(255),
  exam_type VARCHAR(100) NOT NULL,
  
  -- Metadados da prova
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  application_date DATE,
  
  -- Configurações
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_questions INTEGER NOT NULL DEFAULT 0,
  total_points DECIMAL(10,2) NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER NOT NULL DEFAULT 180,
  passing_score DECIMAL(5,2),
  
  -- Controle
  is_official BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados adicionais (flexível)
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Constraint para evitar duplicatas
  CONSTRAINT official_exams_unique_exam UNIQUE(exam_name, exam_year, exam_edition)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_official_exams_type ON official_exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_official_exams_year ON official_exams(exam_year);
CREATE INDEX IF NOT EXISTS idx_official_exams_published ON official_exams(is_published);
CREATE INDEX IF NOT EXISTS idx_official_exams_tags ON official_exams USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_official_exams_created_by ON official_exams(created_by);

-- Add column to simulated_exams to link to official exam
ALTER TABLE simulated_exams 
ADD COLUMN IF NOT EXISTS source_official_exam_id UUID REFERENCES official_exams(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_simulated_exams_source ON simulated_exams(source_official_exam_id);

-- Add comment to table
COMMENT ON TABLE official_exams IS 'Stores official exam templates (e.g., Revalida 2025) that can be used to create multiple user attempts';
COMMENT ON COLUMN official_exams.question_ids IS 'Array of question IDs in the exact order they appear in the official exam';
COMMENT ON COLUMN official_exams.is_official IS 'Always true for official exams to differentiate from user-created simulated exams';
COMMENT ON COLUMN simulated_exams.source_official_exam_id IS 'References the official exam this simulated exam was created from (null for user-created exams)';
