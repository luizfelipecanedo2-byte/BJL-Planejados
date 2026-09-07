import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';

export const supabase = createClient(supabaseUrl, supabaseKey);
