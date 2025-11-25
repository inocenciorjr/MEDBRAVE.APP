CREATE TABLE flashcard_review_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    flashcard_id TEXT NOT NULL,
    grade INTEGER NOT NULL,
    review_time_ms INTEGER,
    stability NUMERIC,
    difficulty NUMERIC,
    elapsed_days NUMERIC,
    scheduled_days NUMERIC,
    reps INTEGER,
    lapses INTEGER,
    state INTEGER NOT NULL,
    due TIMESTAMP WITH TIME ZONE NOT NULL,
    last_review TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);