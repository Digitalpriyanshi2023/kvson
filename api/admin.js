import { supabase, hasSupabaseConfig } from './utils/supabase.js';
import { authenticateAdmin } from './utils/auth.js';

export default async function handler(req, res) {
  // Enforce JWT validation and admin authorization role clearance
  const adminUser = authenticateAdmin(req, res);
  if (!adminUser) return; // Headers and response status were sent by auth handler

  // Robust path parsing to support both index.html and kvson.html endpoint shapes
  const cleanUrl = (req.url || '').split('?')[0];
  const urlParts = cleanUrl.split('/').filter(Boolean);
  const action = urlParts[urlParts.length - 1];

  // 1. Fetch entire database roster for management analysis (GET /api/admin/profiles or GET /api/admin/all-profiles)
  if (req.method === 'GET' && (action === 'profiles' || action === 'all-profiles')) {
    if (!hasSupabaseConfig) {
      // return static mock arrays for local sandbox previewing
      const mockProfiles = [
        { id: 1, full_name: 'Priyanshi Shrestha', email: 'admin@kvson.org', contact: '+977-9841000000', district: 'Kathmandu', occupation: 'Full-Stack Engineer', bio: 'Sovereign data platform supervisor.', is_verified: true, role: 'admin' },
        { id: 2, full_name: 'Ram Narayan Vaishya', email: 'merchant@kvson.org', contact: '+977-9851000002', district: 'Parsa', occupation: 'Merchant Director', bio: 'South Asian commerce coordinator.', is_verified: true, role: 'member' },
        { id: 101, full_name: 'Aman Prasad Shah', email: 'aman@shah.com', contact: '+977-9851000000', district: 'Birgunj', occupation: 'Logistics Operator', bio: 'Seeking registration connection with global trade clusters.', is_verified: false, role: 'member' }
      ];
      return res.status(200).json(mockProfiles);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database fetch error' });
    }
  }

  // 2. Resolve an enrollment request (Approve / Reject) (POST /api/admin/resolve-request)
  if (req.method === 'POST' && action === 'resolve-request') {
    const { id, action: executionVector } = req.body;
    if (!id || !executionVector) {
      return res.status(400).json({ error: 'Missing mandatory fields: id and action are required.' });
    }

    if (!hasSupabaseConfig) {
      return res.status(200).json({ success: true, message: `Application resolved to: ${executionVector.toUpperCase()} (Mock Mode)` });
    }

    try {
      if (executionVector === 'approve') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Verification resolution failed' });
    }
  }

  // 3. Alter system authorization metrics (PATCH /api/admin/role or PATCH /api/admin/alter-role)
  if (req.method === 'PATCH' && (action === 'role' || action === 'alter-role')) {
    const { id, role } = req.body;
    if (!id || !role) {
      return res.status(400).json({ error: 'Missing mandatory fields: id and role are required.' });
    }

    if (!hasSupabaseConfig) {
      return res.status(200).json({ success: true, message: `Role toggled to: ${role.toUpperCase()} (Mock Mode)` });
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Permission status patch failed' });
    }
  }

  // 4. Purge record from directory data clusters (DELETE /api/admin/profiles/:id or DELETE /api/admin/purge-profile)
  if (req.method === 'DELETE') {
    // Extract ID either from URL path (e.g. /api/admin/profiles/123) or query parameter ?id=123
    let id = req.query.id;
    if (!id) {
      // If path matches /profiles/123, the last part of URL parts is the ID
      const secondLast = urlParts[urlParts.length - 2];
      if (secondLast === 'profiles') {
        id = action;
      }
    }

    if (!id) {
      return res.status(400).json({ error: 'Identification key (id) required for delete operations.' });
    }

    if (!hasSupabaseConfig) {
      return res.status(200).json({ success: true, message: 'Profile purged successfully (Mock Mode).' });
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database record deletion failed' });
    }
  }

  return res.status(404).json({ error: 'Administrative action endpoint unmapped.' });
}