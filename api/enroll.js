import { supabase, hasSupabaseConfig } from './utils/supabase.js';
import { hashPassword } from './utils/hash.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { full_name, email, contact, district, occupation, bio, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Missing mandatory fields: full_name, email, and password are required.' });
  }

  // Hash the incoming password securely
  const hashedPassword = hashPassword(password);

  const newProfile = {
    full_name,
    email: email.trim().toLowerCase(),
    contact,
    district,
    occupation,
    bio,
    password: hashedPassword,
    is_verified: false, // Pending admin validation
    role: 'member'       // Default role
  };

  if (!hasSupabaseConfig) {
    return res.status(200).json({
      success: true,
      message: 'Enrollment application captured in local sandbox (Mock Mode).',
      profile: { id: Date.now(), ...newProfile, password: '[PROTECTED]' }
    });
  }

  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', newProfile.email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'An enrollment request or account with this email already exists.' });
    }

    const { error } = await supabase
      .from('profiles')
      .insert([newProfile]);

    if (error) {
      console.error('Supabase Database Insertion Error:', error);
      return res.status(400).json({ error: error.message || 'Database error during insertion.' });
    }

    return res.status(200).json({ success: true, message: 'Enrollment application submitted successfully.' });
  } catch (err) {
    console.error('Server API processing crash:', err);
    return res.status(500).json({ error: 'Internal system error occurred during enrollment.' });
  }
}