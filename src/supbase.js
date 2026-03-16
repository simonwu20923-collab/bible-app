import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);