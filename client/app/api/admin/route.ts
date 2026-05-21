/**
 * Admin Routes - Stats, Users, Domains, Config, Blocklist
 */
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const profile = await getProfile(decoded.sub);
  if (!profile) {
    return { error: 'User not found', status: 401 };
  }

  if (!profile.is_active) {
    return { error: 'Account is disabled', status: 403 };
  }

  if (profile.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

function formatUser(row: any) {
  return {
    _id: row.id,
    id: row.id,
    username: row.username,
    email: row.email || '',
    role: row.role,
    isActive: row.is_active,
    emailCount: row.email_count,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

function formatDomain(row: any) {
  return {
    _id: row.id,
    id: row.id,
    domain: row.domain,
    label: row.label || '',
    isActive: row.is_active,
    isDefault: row.is_default,
    note: row.note || '',
    createdAt: row.created_at,
  };
}

/**
 * GET /api/admin/stats
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);

  // Determine which endpoint based on path
  const endpoint = pathParts[pathParts.length - 1];

  try {
    if (endpoint === 'stats') {
      return handleStats();
    } else if (endpoint === 'users') {
      return handleGetUsers(searchParams);
    } else if (endpoint === 'domains') {
      return handleGetDomains();
    } else if (endpoint === 'config') {
      return handleGetConfig();
    } else if (endpoint === 'blocklist') {
      return handleGetBlocklist();
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    console.error('[Admin] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleStats() {
  const [
    usersResult,
    accountsResult,
    emailsResult,
    domainsResult,
    recentEmailsResult,
  ] = await Promise.all([
    supabaseAdmin!.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin!.from('accounts').select('id', { count: 'exact', head: true }),
    supabaseAdmin!.from('emails').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabaseAdmin!.from('domains').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin!.from('emails').select('received_at', { count: 'exact', head: true }).eq('is_deleted', false).gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekEmails } = await supabaseAdmin!.from('emails').select('received_at').eq('is_deleted', false).gte('received_at', sevenDaysAgo);

  const emailsByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    emailsByDay[key] = 0;
  }

  if (weekEmails) {
    weekEmails.forEach((email: any) => {
      const key = email.received_at.split('T')[0];
      if (emailsByDay[key] !== undefined) {
        emailsByDay[key]++;
      }
    });
  }

  const emailsByDayArray = Object.entries(emailsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalUsers: usersResult.count || 0,
    totalAccounts: accountsResult.count || 0,
    totalEmails: emailsResult.count || 0,
    totalDomains: domainsResult.count || 0,
    recentEmails: recentEmailsResult.count || 0,
    emailsByDay: emailsByDayArray,
    uptime: process.uptime(),
  });
}

async function handleGetUsers(searchParams: URLSearchParams) {
  const search = searchParams.get('search');
  const role = searchParams.get('role');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');

  let query = supabaseAdmin!.from('profiles').select('id, username, role, is_active, email_count, preferences, created_at, last_login', { count: 'exact' });

  if (role) query = query.eq('role', role);
  if (search) query = query.ilike('username', `%${search}%`);

  query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

  const { data: users, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const enrichedUsers = await Promise.all((users || []).map(async (user: any) => {
    let email = '';
    try {
      const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(user.id);
      email = authUser?.user?.email || '';
    } catch { /* ignore */ }
    return {
      ...formatUser(user),
      email,
    };
  }));

  return NextResponse.json({
    users: enrichedUsers,
    total: count || users?.length || 0,
    skip,
    limit,
  });
}

async function handleGetDomains() {
  const { data: domains, error } = await supabaseAdmin!.from('domains').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
  }

  return NextResponse.json({ domains: (domains || []).map(formatDomain) });
}

async function handleGetConfig() {
  const { data: configs, error } = await supabaseAdmin!.from('config').select('key, value');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }

  const result: Record<string, any> = {};
  configs.forEach((c: any) => { result[c.key] = c.value; });

  return NextResponse.json(result);
}

async function handleGetBlocklist() {
  const { data: entries, error } = await supabaseAdmin!.from('ip_blocklist').select('*').order('blocked_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch blocklist' }, { status: 500 });
  }

  const enrichedEntries = await Promise.all((entries || []).map(async (entry: any) => {
    let blockedByName = '';
    if (entry.blocked_by) {
      try {
        const { data: authUser } = await supabaseAdmin!.auth.admin.getUserById(entry.blocked_by);
        blockedByName = authUser?.user?.email || '';
      } catch { /* ignore */ }
    }
    return {
      ip: entry.ip,
      reason: entry.reason || '',
      blockedAt: entry.blocked_at,
      expiresAt: entry.expires_at,
      blockedBy: blockedByName,
    };
  }));

  return NextResponse.json({ entries: enrichedEntries });
}

/**
 * POST /api/admin/*
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;
  const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1];

  try {
    const body = await request.json();

    if (endpoint === 'user') {
      return handleCreateUser(body);
    } else if (endpoint === 'domain') {
      return handleAddDomain(body, user.id);
    } else if (endpoint === 'blocklist') {
      return handleBlockIP(body, user.id);
    } else if (endpoint === 'config') {
      return handleUpdateConfig(body, user.id);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    console.error('[Admin] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCreateUser(body: any) {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(32).required(),
    password: Joi.string().min(8).max(128).required(),
  });

  const { error: schemaError, value } = schema.validate(body);
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  const { username, password } = value;

  // Check if username is taken
  const { data: existing } = await supabaseAdmin!.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const placeholderEmail = `${username.toLowerCase()}@tmail.local`;
  const { data: authData, error: authError } = await supabaseAdmin!.auth.admin.createUser({
    email: placeholderEmail,
    password,
    email_confirm: true,
    user_metadata: { username: username.toLowerCase() },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message || 'Failed to create user' }, { status: 400 });
  }

  const authUser = authData.user;

  // Wait and upsert profile
  await new Promise(resolve => setTimeout(resolve, 500));

  await supabaseAdmin!.from('profiles').upsert({ id: authUser.id, username: username.toLowerCase() }, { onConflict: 'id' });

  const { data: profile } = await supabaseAdmin!.from('profiles').select('*').eq('id', authUser.id).single();

  console.log(`[Admin] Created user: ${username} (${authUser.id})`);
  return NextResponse.json({ user: formatUser(profile) }, { status: 201 });
}

async function handleAddDomain(body: any, adminId: string) {
  const schema = Joi.object({
    domain: Joi.string().domain().required(),
    label: Joi.string().allow('').max(100).default(''),
    isDefault: Joi.boolean().default(false),
    note: Joi.string().allow('').max(500).default(''),
  });

  const { error: schemaError, value } = schema.validate(body);
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  value.domain = value.domain.toLowerCase();

  if (value.isDefault) {
    await supabaseAdmin!.from('domains').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: domain, error: insertError } = await supabaseAdmin!.from('domains').insert({
    domain: value.domain,
    label: value.label || '',
    is_default: value.isDefault,
    note: value.note || '',
    added_by: adminId,
  }).select().single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 });
  }

  return NextResponse.json(formatDomain(domain), { status: 201 });
}

async function handleBlockIP(body: any, adminId: string) {
  const schema = Joi.object({
    ip: Joi.string().required(),
    reason: Joi.string().max(500).default(''),
    expiresInHours: Joi.number().positive().max(8760).default(null),
  });

  const { error: schemaError, value } = schema.validate(body);
  if (schemaError) {
    return NextResponse.json({ error: schemaError.details[0].message }, { status: 400 });
  }

  const expiresAt = value.expiresInHours ? new Date(Date.now() + value.expiresInHours * 3600000).toISOString() : null;

  const { data: entry, error: upsertError } = await supabaseAdmin!.from('ip_blocklist').upsert({
    ip: value.ip,
    reason: value.reason || '',
    blocked_by: adminId,
    blocked_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: 'ip' }).select().maybeSingle();

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to block IP' }, { status: 500 });
  }

  return NextResponse.json(entry, { status: 201 });
}

async function handleUpdateConfig(body: any, adminId: string) {
  const allowedKeys = ['rateLimit', 'defaultUserRole', 'maintenanceMode', 'requireEmailVerification', 'maxMailboxStorageMB', 'maxEmailSizeMB', 'captchaEnabled', 'captchaSiteKey', 'captchaSecretKey', 'allowUserOtpKey'];

  const updates: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    const { error: upsertError } = await supabaseAdmin!.from('config').upsert({
      key,
      value,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (upsertError) {
      return NextResponse.json({ error: `Failed to update config key: ${key}` }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Config updated', updates });
}

/**
 * PUT /api/admin/config
 */
export async function PUT(request: NextRequest) {
  return POST(request);
}
