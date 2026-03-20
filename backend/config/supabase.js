import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Faltan variables SUPABASE_URL o SUPABASE_ANON_KEY en .env');
}

// Cliente normal (para operaciones de lectura / login)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (bypasea RLS — úsalo en el backend para writes/deletes)
export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey, // fallback a anon si no hay service key
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

console.log('✅ Cliente Supabase inicializado');

export default supabase;