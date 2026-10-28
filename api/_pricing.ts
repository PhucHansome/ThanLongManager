import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { DEFAULT_PRICING } from './_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: plans, error } = await supabase.from('pricing').select('*').eq('is_active', true).order('months', { ascending: true });
    if (!error && plans && plans.length > 0) return res.json({ status: true, plans });
    res.json({ status: true, plans: DEFAULT_PRICING });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}