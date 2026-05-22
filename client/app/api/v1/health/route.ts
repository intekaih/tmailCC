/**
 * API v1 - Health Check
 * GET /api/v1/health
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
  });
}
