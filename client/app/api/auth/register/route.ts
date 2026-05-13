/**
 * POST /api/auth/register
 * Creates a new user account using Supabase Auth
 * Profile is automatically created by database trigger
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Joi from 'joi';

const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must be at most 30 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
    }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email address',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters',
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate input
    const { error: validationError, value } = registerSchema.validate(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError.details[0].message },
        { status: 400 }
      );
    }

    const { username, email, password } = value;

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured. Please contact administrator.' },
        { status: 503 }
      );
    }

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Check if email already registered (via auth.users)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmail = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email for demo purposes
      user_metadata: {
        username: username.toLowerCase(),
      },
    });

    if (authError) {
      console.error('[Register] Auth error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Profile will be automatically created by the database trigger
    // public.handle_new_user() inserts into profiles table

    console.log(`[Register] User created: ${username} (${authUser.user.id})`);

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authUser.user.id,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
      },
    });
  } catch (err) {
    console.error('[Register] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
