import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const urlParts = req.url.split('/');
  const action = urlParts[urlParts.length - 1].split('?')[0];

  // 1. Fetch entire database roster for management analysis
  if (req.method === 'GET' && action === 'all-profiles') {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // 2. Resolve an enrollment request (Approve / Reject)
  if (req.method === 'POST' && action === 'resolve-request') {
    const { id, action: vector } = req.body;
    if (vector === 'approve') {
      await supabase.from('profiles').update({ is_verified: true }).eq('id', id);
    } else {
      await supabase.from('profiles').delete().eq('id', id);
    }
    return res.status(200).json({ success: true });
  }

  // 3. Alter system authorization metrics (Admin / Member toggle)
  if (req.method === 'PATCH' && action === 'alter-role') {
    const { id, role } = req.body;
    await supabase.from('profiles').update({ role }).eq('id', id);
    return res.status(200).json({ success: true });
  }

  // 4. Purge clear records from directory data clusters
  if (req.method === 'DELETE' && action === 'purge-profile') {
    const id = req.query.id;
    await supabase.from('profiles').delete().eq('id', id);
    return res.status(200).json({ success: true });
  }

  return res.status(404).json({ error: 'Action endpoint unmapped.' });
}