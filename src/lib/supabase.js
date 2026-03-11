import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnludjszseunfbombcrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHVkanN6c2V1bmZib21iY3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzYwNzksImV4cCI6MjA4NzE1MjA3OX0.E78o6905xEpCtwaBf9-59_gJZ3Z22yIh7y2y2LsLMuQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service Role Client for Admin actions (Caution: restricted to specific components)
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHVkanN6c2V1bmZib21iY3JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3NjA3OSwiZXhwIjoyMDg3MTUyMDc5fQ.MAsYoLqnfcE45sRlLSbINSLaA1li-rv0Pi2prsBeZas';
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'sb-admin-auth-token' // Prevents conflict with standard client
    }
});
