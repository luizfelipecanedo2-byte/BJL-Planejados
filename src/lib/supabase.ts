
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L'; // Você precisa colar a chave aqui ou usar variáveis de ambiente

export const supabase = createClient(supabaseUrl, supabaseKey);
