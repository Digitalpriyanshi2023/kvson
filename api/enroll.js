import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // block unauthorized requests
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Extract variables carefully from the form request payload
  const { full_name, email, contact, password, district, occupation, bio } = req.body;

  try {
    // Insert explicitly matched key columns into the profile data array
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        { 
          full_name, 
          email, 
          contact, 
          password, // Maps to password text or your custom access key column
          district, 
          occupation, 
          bio,
          is_verified: false, // Explicit initial flag state
          role: 'member'       // Base level access layer assignment
        }
      ]);

    if (error) {
      console.error("Supabase Database Insertion Error Context:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Server API processing crash details:", err);
    return res.status(500).json({ error: 'Internal system routing error occurred.' });
  }
}