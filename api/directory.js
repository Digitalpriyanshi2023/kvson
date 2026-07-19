import { supabase, hasSupabaseConfig } from './utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!hasSupabaseConfig) {
    // Return sample verified public directory for local preview
    const mockPublicData = [
      { 
        id: 1,
        full_name: "Priyanshi Shrestha", 
        role: "admin", 
        occupation: "Full-Stack System Architect", 
        district: "Kathmandu", 
        bio: "Building live architectural frameworks for community operational portals." 
      },
      { 
        id: 2,
        full_name: "Ram Narayan Vaishya", 
        role: "member", 
        occupation: "Merchant Director", 
        district: "Parsa", 
        bio: "Focused on expansion matrices within South Asian commerce circuits." 
      }
    ];
    return res.status(200).json(mockPublicData);
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, occupation, district, bio, role')
      .eq('is_verified', true);

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('API directory fetch crash context:', err);
    return res.status(500).json({ error: 'Failed to retrieve directory records.' });
  }
}