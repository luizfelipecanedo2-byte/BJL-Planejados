-- CREATE TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
    created_by UUID REFERENCES auth.users(id)
);

-- ENABLE RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can see tasks assigned to them or created by them"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (auth.uid() = assigned_to OR auth.uid() = created_by OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update tasks assigned to them"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() = assigned_to OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK (auth.uid() = assigned_to OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can do everything with tasks"
    ON public.tasks FOR ALL
    TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
