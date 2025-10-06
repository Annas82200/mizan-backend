// Quick script to create superadmin user hash
// Run: node create-superadmin.js

import bcrypt from 'bcryptjs';

async function createSuperadmin() {
  console.log('🔐 Generating password hash for Mizan Superadmin...\n');

  const email = 'anna@mizan.com';
  const password = 'MizanAdmin2024!';

  // Generate hash with 10 salt rounds
  const hash = await bcrypt.hash(password, 10);

  console.log('✅ Password hash generated successfully!\n');
  console.log('📋 Use this information:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Hash:     ${hash}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verify the hash works
  const isValid = await bcrypt.compare(password, hash);
  console.log(`✅ Hash verification: ${isValid ? 'PASSED' : 'FAILED'}\n`);

  console.log('📝 Next Steps:\n');
  console.log('1. Copy the hash above');
  console.log('2. Go to Railway → Your PostgreSQL database → Query tab');
  console.log('3. Run this SQL:\n');

  console.log(`-- Create or update superadmin user
INSERT INTO users (
  tenant_id,
  email,
  password_hash,
  name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  (SELECT id FROM tenants WHERE name = 'Mizan Superadmin' LIMIT 1),
  '${email}',
  '${hash}',
  'Anna Dahrouj',
  'superadmin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'superadmin',
  is_active = true,
  updated_at = NOW();

-- Verify user was created
SELECT id, email, name, role, is_active, created_at
FROM users
WHERE email = '${email}';
`);

  console.log('\n4. Test login at https://mizan.work/login');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n✨ Done!\n');
}

createSuperadmin().catch(console.error);
