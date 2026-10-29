// api/_system/version.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('update_url, latest_version')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return res.status(500).json({ status: false, message: 'Không lấy được thông tin phiên bản' });
    }

    return res.status(200).json({ status: true, update_url: data.update_url, latest_version: data.latest_version });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}