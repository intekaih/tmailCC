/**
 * GET /api/config - Public configuration keys
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ captchaEnabled: false, captchaSiteKey: '' });
    }

    const { data: configs, error } = await supabaseAdmin
      .from('config')
      .select('key, value')
      .in('key', ['captchaEnabled', 'captchaSiteKey']);

    if (error) {
      console.error('[Config] GET /api/config error:', error);
      return NextResponse.json({ captchaEnabled: false, captchaSiteKey: '' });
    }

    const result = {
      captchaEnabled: false,
      captchaSiteKey: '',
    };

    configs?.forEach((c: any) => {
      if (c.key === 'captchaEnabled') {
        result.captchaEnabled = c.value === true || c.value === 'true';
      }
      if (c.key === 'captchaSiteKey') {
        result.captchaSiteKey = c.value || '';
      }
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Config] GET /api/config unexpected error:', err);
    return NextResponse.json({ captchaEnabled: false, captchaSiteKey: '' });
  }
}
