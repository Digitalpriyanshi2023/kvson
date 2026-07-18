import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data || data.password !== password) {
      return res.status(401).json({ error: 'Invalid identification keys.' });
    }

    // Returns user metadata profile back to browser context storage arrays
    return res.status(200).json({
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      token: "mock-jwt-session-key" 
    });
  } catch (err) {
    return res.status(500).json({ error: 'Authentication processing fault.' });
  }
}