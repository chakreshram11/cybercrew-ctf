import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function provisionSuperAdmin() {
  const email = 'chakreshram11@gmail.com';
  const password = 'Chakreshram@152852';
  const username = 'chakresh';
  const displayName = 'Chakresh Ram';

  console.log(`[Cyber Crew CTF] Provisioning Super Admin: ${email}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Check if user exists in Supabase Auth
  const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to query Supabase Auth users:', listError.message);
    process.exit(1);
  }

  const existingAuthUser = usersList.users.find((u) => u.email === email);
  let authUserId: string;

  if (existingAuthUser) {
    console.log(`[Auth] Existing Auth user found: ${existingAuthUser.id}. Updating password & confirming email...`);
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      existingAuthUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName,
          role: 'SUPER_ADMIN',
        },
      }
    );

    if (updateError || !updatedUser) {
      console.error('Failed to update Auth user:', updateError?.message);
      process.exit(1);
    }
    authUserId = updatedUser.user.id;
  } else {
    console.log(`[Auth] Creating new Auth user...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName,
        role: 'SUPER_ADMIN',
      },
    });

    if (createError || !newUser) {
      console.error('Failed to create Auth user:', createError?.message);
      process.exit(1);
    }
    authUserId = newUser.user.id;
  }

  console.log(`[Auth] User ID confirmed: ${authUserId}`);

  // 2. Upsert into public.users table with SUPER_ADMIN role
  const { data: existingDbUser } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${email},auth_id.eq.${authUserId}`)
    .maybeSingle();

  if (existingDbUser) {
    console.log(`[Database] Updating existing profile in public.users to SUPER_ADMIN...`);
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({
        auth_id: authUserId,
        username,
        display_name: displayName,
        role: 'SUPER_ADMIN',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDbUser.id);

    if (dbUpdateError) {
      console.error('Failed to update public.users:', dbUpdateError.message);
      process.exit(1);
    }
  } else {
    console.log(`[Database] Inserting new operative profile in public.users as SUPER_ADMIN...`);
    const { error: dbInsertError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        auth_id: authUserId,
        username,
        display_name: displayName,
        email,
        role: 'SUPER_ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (dbInsertError) {
      console.error('Failed to insert into public.users:', dbInsertError.message);
      process.exit(1);
    }
  }

  console.log('====================================================');
  console.log(' ✅ SUPER ADMIN ACCOUNT PROVISIONED SUCCESSFULLY');
  console.log('====================================================');
  console.log(` Callsign / Username : ${username}`);
  console.log(` Email / Login       : ${email}`);
  console.log(` Password            : ${password}`);
  console.log(` Security Role       : SUPER_ADMIN`);
  console.log('====================================================');
}

provisionSuperAdmin();
