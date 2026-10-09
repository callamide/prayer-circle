-- ==============================================================================
-- Prayer Circle V2 Migration: Prayer Walk & Wellness Sessions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.wellness_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_prayer_id UUID REFERENCES public.prayers(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'prayer_walk' CHECK (type IN ('prayer_walk', 'breath_prayer')),
  steps INT,
  duration_seconds INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.wellness_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only insert/select where user_id = auth.uid()
CREATE POLICY "Users select own wellness sessions" ON public.wellness_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own wellness sessions" ON public.wellness_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
