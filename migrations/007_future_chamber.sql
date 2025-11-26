-- Future extensibility table
CREATE TABLE IF NOT EXISTS future_chamber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horizon TEXT NOT NULL,
  praxis TEXT NOT NULL,
  atelier TEXT NOT NULL,
  threshold TEXT NOT NULL,
  covenant JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_future_chamber_horizon ON future_chamber(horizon);
