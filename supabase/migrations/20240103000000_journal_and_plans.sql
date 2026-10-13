-- 10. Journal Entries (Meditation Notes & Reflections)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    linked_prayer_id UUID REFERENCES public.prayers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    scripture TEXT,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    steps_walked INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own journal entries" ON public.journal_entries
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users insert own journal entries" ON public.journal_entries
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own journal entries" ON public.journal_entries
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users delete own journal entries" ON public.journal_entries
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 11. User Prayer Plans
CREATE TABLE IF NOT EXISTS public.user_prayer_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    current_day INT NOT NULL DEFAULT 1,
    completed_days INT[] NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_completed_at TIMESTAMPTZ,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id, plan_id)
);

ALTER TABLE public.user_prayer_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own plans" ON public.user_prayer_plans
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users insert own plans" ON public.user_prayer_plans
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own plans" ON public.user_prayer_plans
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
