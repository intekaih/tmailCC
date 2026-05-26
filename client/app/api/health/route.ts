/**
 * Health Check API Route
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    supabase: supabaseConfigured ? 'configured' : 'not_configured',
    realtime: 'via-supabase-realtime',
  });
}
