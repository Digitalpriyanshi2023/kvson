import { supabase, hasSupabaseConfig } from './utils/supabase.js';
import { verifyPassword } from './utils/hash.js';
import { generateToken } from './utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required fields.' });
  }

  // Standalone Mock Mode fallback
  if (!hasSupabaseConfig) {
    const isMockAdmin = email.toLowerCase() === 'admin@kvsn.org' || email.toLowerCase() === 'admin@kvson.org';
    const isMockMember = email.toLowerCase() === 'member@kvsn.org' || email.toLowerCase() === 'member@kvson.org';

    if ((isMockAdmin && password === 'admin123') || (isMockMember && password === 'member123')) {
      const mockUser = {
        id: isMockAdmin ? 'mock-admin-id' : 'mock-member-id',
        full_name: isMockAdmin ? 'Sovereign Administrator' : 'Standard Member',
        email: email.toLowerCase(),
        role: isMockAdmin ? 'admin' : 'member',
        is_verified: true
      };

      const token = generateToken(mockUser);
      return res.status(200).json({
        user: mockUser,
        token: token
      });
    }

    return res.status(401).json({ error: 'Invalid credentials. For local sandbox, use: admin@kvson.org / admin123 or member@kvson.org / member123.' });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid identification credentials.' });
    }

    // Verify Password (supports legacy plaintext migration verification)
    const isValid = verifyPassword(password, data.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid identification credentials.' });
    }

    if (!data.is_verified) {
      return res.status(403).json({ error: 'This profile is pending validation from Samaj administrators.' });
    }

    // Construct sanitized user object (hide password hash)
    const authenticatedUser = {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      contact: data.contact,
      district: data.district,
      occupation: data.occupation,
      business_name: data.business_name,
      bio: data.bio,
      role: data.role,
      is_verified: data.is_verified
    };

    const token = generateToken(authenticatedUser);
    return res.status(200).json({
      user: authenticatedUser,
      token: token
    });
  } catch (err) {
    console.error('API login handling crash context:', err);
    return res.status(500).json({ error: 'Authentication internal processing fault.' });
  }
}