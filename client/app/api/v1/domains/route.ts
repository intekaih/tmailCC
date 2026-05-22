/**
 * API v1 - Domains
 * GET /api/v1/domains - List active domains (public, optional auth)
 */
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, optionalApiKey } from '@/lib/services/apiV1Auth';

export async function GET(request: NextRequest) {
  try {
    // Optional auth — domains are public
    await optionalApiKey(request);

    if (!supabaseAdmin) {
      return errorResponse('INTERNAL_ERROR', 'Database not configured', 503);
    }

    const { data: domains, error } = await supabaseAdmin
      .from('domains')
      .select('id, domain, label, is_default')
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('[API v1] GET /domains error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch domains', 500);
    }

    return successResponse({
      domains: (domains || []).map(d => ({
        id: d.id,
        domain: d.domain,
        label: d.label,
        isDefault: d.is_default,
      })),
    });
  } catch (err) {
    console.error('[API v1] GET /domains unexpected error:', err);
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
