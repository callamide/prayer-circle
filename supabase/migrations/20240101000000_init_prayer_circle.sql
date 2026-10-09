-- ==============================================================================
-- Prayer Circle Database Schema & RLS Policies
-- "Small prayers. Real faith. Together."
-- ==============================================================================

-- 1. Create Enums / Domains
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_category') THEN
        CREATE TYPE prayer_category AS ENUM ('Family', 'Health', 'Work', 'Spiritual', 'Other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_privacy') THEN
        CREATE TYPE prayer_privacy AS ENUM ('private', 'group');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prayer_status') THEN
        CREATE TYPE prayer_status AS ENUM ('active', 'answered', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
        CREATE TYPE reaction_type AS ENUM ('prayed', 'love', 'amen');
    END IF;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    prayer_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_prayed_at DATE,
    grace_days_used INT NOT NULL DEFAULT 0,
    grace_period_start DATE DEFAULT CURRENT_DATE,
    reminder_time TEXT DEFAULT '06:00',
    notify_group BOOLEAN DEFAULT true,
    notify_gentle_miss BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Prayer Groups Table
CREATE TABLE IF NOT EXISTS public.prayer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Group Members Table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.prayer_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- 5. Prayers Table
CREATE TABLE IF NOT EXISTS public.prayers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.prayer_groups(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    details TEXT,
    category prayer_category NOT NULL DEFAULT 'Other',
    privacy prayer_privacy NOT NULL DEFAULT 'private',
    status prayer_status NOT NULL DEFAULT 'active',
    testimony TEXT,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Prayer Checkins Table
CREATE TABLE IF NOT EXISTS public.prayer_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    prayer_id UUID REFERENCES public.prayers(id) ON DELETE SET NULL,
    prayed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Prayer Reactions Table
CREATE TABLE IF NOT EXISTS public.prayer_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(prayer_id, user_id, type)
);

-- 8. Prayer Updates Table
CREATE TABLE IF NOT EXISTS public.prayer_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- VALIDATION TRIGGERS & BUSINESS LOGIC
-- ==============================================================================

-- Enforce Max 15 members per group
CREATE OR REPLACE FUNCTION public.check_group_max_members()
RETURNS TRIGGER AS $$
DECLARE
    current_count INT;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM public.group_members
    WHERE group_id = NEW.group_id;

    IF current_count >= 15 THEN
        RAISE EXCEPTION 'This prayer circle has reached the maximum capacity of 15 members.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_group_max_members ON public.group_members;
CREATE TRIGGER trg_check_group_max_members
    BEFORE INSERT ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.check_group_max_members();

-- Auto-create profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, prayer_streak, last_prayed_at, grace_days_used)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Friend in Faith'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
        0,
        NULL,
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Auto-add group creator as group member
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (NEW.id, NEW.owner_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_after_group_create ON public.prayer_groups;
CREATE TRIGGER trg_after_group_create
    AFTER INSERT ON public.prayer_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_group();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_updates ENABLE ROW LEVEL SECURITY;

-- Profiles:
CREATE POLICY "Public profile view" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Prayer Groups:
CREATE POLICY "View groups member of or search invite" ON public.prayer_groups
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR owner_id = auth.uid()
        OR true -- allows invite code lookup
    );

CREATE POLICY "Create prayer group" ON public.prayer_groups
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner update prayer group" ON public.prayer_groups
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Owner delete prayer group" ON public.prayer_groups
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- Group Members:
CREATE POLICY "View group members" ON public.group_members
    FOR SELECT TO authenticated
    USING (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Join group" ON public.group_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Leave or remove member" ON public.group_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR group_id IN (SELECT id FROM public.prayer_groups WHERE owner_id = auth.uid())
    );

-- Prayers:
-- "Users can only read prayers where privacy=private AND user_id=auth.uid() OR group_id IN (SELECT group_id FROM group_members WHERE user_id=auth.uid())"
CREATE POLICY "Read accessible prayers" ON public.prayers
    FOR SELECT TO authenticated
    USING (
        (privacy = 'private' AND user_id = auth.uid())
        OR (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
    );

CREATE POLICY "Insert own prayers" ON public.prayers
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own prayers" ON public.prayers
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Delete own prayers" ON public.prayers
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Prayer Reactions:
-- "Only group members can insert reactions"
CREATE POLICY "View prayer reactions" ON public.prayer_reactions
    FOR SELECT TO authenticated
    USING (
        prayer_id IN (
            SELECT id FROM public.prayers
            WHERE (privacy = 'private' AND user_id = auth.uid())
               OR (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
        )
    );

CREATE POLICY "Insert reactions if in group" ON public.prayer_reactions
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND prayer_id IN (
            SELECT id FROM public.prayers
            WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Delete own reaction" ON public.prayer_reactions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Prayer Updates:
-- "Only group members can insert updates"
CREATE POLICY "View prayer updates" ON public.prayer_updates
    FOR SELECT TO authenticated
    USING (
        prayer_id IN (
            SELECT id FROM public.prayers
            WHERE (privacy = 'private' AND user_id = auth.uid())
               OR (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
        )
    );

CREATE POLICY "Insert updates for prayer" ON public.prayer_updates
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND prayer_id IN (
            SELECT id FROM public.prayers
            WHERE user_id = auth.uid()
               OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        )
    );

-- Prayer Checkins:
CREATE POLICY "View checkins" ON public.prayer_checkins
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR prayer_id IN (
            SELECT id FROM public.prayers
            WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Insert checkin" ON public.prayer_checkins
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- REALTIME REPLICATION
-- Enable Realtime on prayers, prayer_updates, prayer_reactions
-- ==============================================================================

DO $$ BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prayers;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_updates;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_reactions;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;
