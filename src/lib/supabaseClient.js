/**
 * supabaseClient — conexão única com o Supabase.
 * A chave "publishable" é pública por design (segura de expor no front-end);
 * a proteção real vem das políticas de Row Level Security no banco.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yxkmbimblfpgesujfwze.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nM3WL1BXjOR8tfMam8ehEA_ONzpOIFS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
