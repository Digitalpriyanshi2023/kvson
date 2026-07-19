import { supabase, hasSupabaseConfig } from './utils/supabase.js';
import { authenticate } from './utils/auth.js';

export default async function handler(req, res) {
  // Check if authenticated
  const user = authenticate(req, res);
  if (!user) return; // Headers and response status were sent by authenticate()

  if (req.method === 'GET') {
    if (!hasSupabaseConfig) {
      // Return simulated mock response if Supabase is offline
      return res.status(200).json({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name || 'Demo User',
        contact: '+977-9800000001',
        district: 'Kathmandu',
        occupation: 'Software Engineer',
        business_name: 'Tech Solutions',
        bio: 'Self-proclaimed development setup mock profile'
      });
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve profile data.' });
    }
  }

  if (req.method === 'PATCH') {
    const { full_name, contact, district, occupation, business_name, bio } = req.body;
    
    // Explicitly select columns to update to prevent escalation
    const updatePayload = { 
      full_name, 
      contact, 
      district, 
      occupation, 
      business_name, 
      bio 
    };

    if (!hasSupabaseConfig) {
      return res.status(200).json({
        message: 'Profile updated in sandbox database successfully.',
        profile: { ...user, ...updatePayload }
      });
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database update transaction failed.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
