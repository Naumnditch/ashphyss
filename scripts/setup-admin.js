const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Admin User';

  if (!email || !password) {
    console.error('Usage: node setup-admin.js <email> <password> [name]');
    console.error('Example: node setup-admin.js admin@example.com mypassword "Admin User"');
    process.exit(1);
  }

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          name,
          role: 'admin'
        }
      ])
      .select();

    if (error) {
      console.error('Error creating admin user:', error);
      process.exit(1);
    }

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Name:', name);
    console.log('Role: admin');
    console.log('\nYou can now login at /admin/login');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminUser();

