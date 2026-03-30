import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vchdaboijdpvbmwgmfxo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaGRhYm9pamRwdmJtd2dtZnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTgyMzUsImV4cCI6MjA5MDIzNDIzNX0.PLhkYVJSQvYtB_GBKPgvBQZKR7_md0-3GNyOqI0P7zA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
