-- Rollback Migration: Remove official_exams table and modifications

-- Remove index from simulated_exams
DROP INDEX IF EXISTS idx_simulated_exams_source;

-- Remove column from simulated_exams
ALTER TABLE simulated_exams 
DROP COLUMN IF EXISTS source_official_exam_id;

-- Drop indexes from official_exams
DROP INDEX IF EXISTS idx_official_exams_created_by;
DROP INDEX IF EXISTS idx_official_exams_tags;
DROP INDEX IF EXISTS idx_official_exams_published;
DROP INDEX IF EXISTS idx_official_exams_year;
DROP INDEX IF EXISTS idx_official_exams_type;

-- Drop official_exams table
DROP TABLE IF EXISTS official_exams;
