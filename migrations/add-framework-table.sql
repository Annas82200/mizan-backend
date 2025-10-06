-- Add framework_config table for storing 7-Cylinder framework configuration

CREATE TABLE IF NOT EXISTS framework_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  cylinders JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on version for quick lookups
CREATE INDEX IF NOT EXISTS idx_framework_version ON framework_config(version);

-- Create index on is_active for quick active config lookup
CREATE INDEX IF NOT EXISTS idx_framework_active ON framework_config(is_active);

-- Insert default framework configuration
INSERT INTO framework_config (version, cylinders, is_active)
VALUES (1, '[
  {
    "cylinder": 1,
    "name": "Safety & Survival",
    "definition": "Protecting life and dignity by ensuring health, stability, and freedom from harm.",
    "ethicalPrinciple": "Preservation of Life",
    "enablingValues": [
      {"name": "Safety", "definition": "Creates environments free from harm where people feel secure."},
      {"name": "Stability", "definition": "Establishes dependable systems and consistent leadership."},
      {"name": "Preparedness", "definition": "Anticipates risks through prevention and training."},
      {"name": "Wellbeing", "definition": "Promotes holistic balance for sustainable thriving."}
    ],
    "limitingValues": [
      {"name": "Fear", "definition": "Uses control or intimidation instead of trust."},
      {"name": "Neglect", "definition": "Ignores warning signs threatening wellbeing."},
      {"name": "Instability", "definition": "Creates chaos through unclear priorities."},
      {"name": "Complacency", "definition": "Fails to update systems, leaving people vulnerable."}
    ]
  }
]'::jsonb, true)
ON CONFLICT DO NOTHING;
