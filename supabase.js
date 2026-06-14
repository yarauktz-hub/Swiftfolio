// ── FORGECV SUPABASE CONFIG ──
// Replace the values below with your actual Supabase credentials

const SUPABASE_URL = 'https://wjgkpaipwdxxntbudatd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ2twYWlwd2R4eG50YnVkYXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTkzNzUsImV4cCI6MjA5Njg5NTM3NX0.oJ0CRc_NSC-KZ7JIpHbTx7CXz_pCwe6HrDobKNtjk5k';

// ── INIT ──
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── AUTH ──

// Sign up new user
async function signUp(email, password, fullName) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) return { error: error.message };

  // Create profile
  if (data.user) {
    await db.from('profiles').insert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      plan: 'free',
      downloads: 0
    });
  }

  return { data };
}

// Sign in existing user
async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { data };
}

// Sign out
async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) return { error: error.message };
  window.location.href = 'login.html';
}

// Get current user
async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

// Get user profile
async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    // Profile may not exist yet, create it
    const { data: newProfile } = await db
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        plan: 'free',
        downloads: 0
      })
      .select()
      .maybeSingle();
    return newProfile;
  }
  return data;
}

// ── CVS ──

// Save a new CV
async function saveCV(title, template, cvData) {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const { data, error } = await db.from('cvs').insert({
    user_id: user.id,
    title: title || 'Untitled CV',
    template: template || 'classic',
    cv_data: cvData
  }).select().single();

  if (error) return { error: error.message };
  return { data };
}

// Get all CVs for current user
async function getCVs() {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const { data, error } = await db
    .from('cvs')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

// Update existing CV
async function updateCV(cvId, title, template, cvData) {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const { data, error } = await db
    .from('cvs')
    .update({
      title,
      template,
      cv_data: cvData,
      updated_at: new Date().toISOString()
    })
    .eq('id', cvId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

// Delete a CV
async function deleteCV(cvId) {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const { error } = await db
    .from('cvs')
    .delete()
    .eq('id', cvId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ── DOWNLOADS ──

// Track a download and check if user is on free or pro plan
async function trackDownload() {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const profile = await getProfile();
  if (!profile) return { error: 'Profile not found' };

  // Increment download count
  await db
    .from('profiles')
    .update({ downloads: (profile.downloads || 0) + 1 })
    .eq('id', user.id);

  return { plan: profile.plan, downloads: profile.downloads + 1 };
}

// Upgrade user to pro after payment
async function upgradeToPro() {
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  const { error } = await db
    .from('profiles')
    .update({ plan: 'pro' })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Check if user is pro
async function isPro() {
  const profile = await getProfile();
  if (!profile) return false;
  return profile.plan === 'pro';
}

// ── AUTH STATE LISTENER ──
// Call this on every page to check login status
function onAuthChange(callback) {
  db.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ── PROTECT PAGE ──
// Call this on dashboard and other protected pages
async function requireAuth() {
  const user = await getUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}
