/**
 * Supabase Configuration
 * 
 * Configured for project ref: fnludjszseunfbombcrb
 */

// We extract the Project URL from the ref embedded in the anon key
const SUPABASE_URL = 'https://fnludjszseunfbombcrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHVkanN6c2V1bmZib21iY3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzYwNzksImV4cCI6MjA4NzE1MjA3OX0.E78o6905xEpCtwaBf9-59_gJZ3Z22yIh7y2y2LsLMuQ';

// Initialize the standard public Supabase client (used for normal queries and login)
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// TEMPORARY: Service Role Key for Admin User Creation
// WARNING: This gives full bypass to Row Level Security and allows creating Auth users.
// In a real production app, this should NEVER be in the frontend JS. It should be in a Supabase Edge Function.
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHVkanN6c2V1bmZib21iY3JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3NjA3OSwiZXhwIjoyMDg3MTUyMDc5fQ.MAsYoLqnfcE45sRlLSbINSLaA1li-rv0Pi2prsBeZas';

// Initialize the Admin-only client (used EXCLUSIVELY by admin.js to create student accounts)
if (SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPER_SECRET_SERVICE_ROLE_KEY_HERE') {
    window.supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
} else {
    // Fallback stub to prevent crashes if key isn't added yet, but shows a clear error.
    window.supabaseAdmin = null;
    console.warn("Supabase Service Role Key is missing. Admin cannot create new student accounts.");
}
