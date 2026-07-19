import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables (useful for both local and edge deployments)
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = !!(
  url &&
  key &&
  url !== '' &&
  key !== '' &&
  !url.includes('your-supabase-project') &&
  !key.includes('your-supabase-anon-key')
);

export const supabase = hasSupabaseConfig ? createClient(url, key) : null;
