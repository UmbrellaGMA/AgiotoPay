import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ftctukhrnryobqfqokmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Y3R1a2hybnJ5b2JxZnFva21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODk5NzMsImV4cCI6MjEwMzc2NTk3M30.EdowObE0LA0M5QF2bTMMbPPoyk46XA6lLKIcgFr7260';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
