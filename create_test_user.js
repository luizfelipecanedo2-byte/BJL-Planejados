import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'tester@example.com';
  const password = 'password123';

  console.log(`Attempting to sign up ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.log('Sign up error (could mean user already exists):', signUpError.message);
  } else {
    console.log('Sign up successful! User ID:', signUpData.user?.id);
  }

  console.log(`Attempting to sign in...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  const user = signInData.user;
  console.log('Sign in successful! User ID:', user.id);

  console.log('Updating profile role to admin...');
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select();

  if (updateError) {
    console.error('Error updating role:', updateError.message);
  } else {
    console.log('Role updated successfully! Profile data:', updateData);
  }
}

run();
