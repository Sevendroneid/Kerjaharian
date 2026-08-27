// api/update-location/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1. Ambil environment variables dari Vercel
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      );
    }

    // 2. Inisialisasi Supabase Client dengan SERVICE ROLE KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Validasi Auth Token dari header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // 4. Parse & validasi input body
    const body = await req.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates format. Must be numbers.' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // 5. UPDATE DATABASE MENGGUNAKAN SERVICE ROLE KEY
    // Ini akan menembus RLS Policy "System update workers"
    const { error: updateError } = await supabaseAdmin
      .from('workers')
      .update({
        latitude,
        longitude,
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', user.id)
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update location in database' },
        { status: 500 }
      );
    }

    // 6. Sukses!
    return NextResponse.json(
      { 
        success: true, 
        message: 'Location updated securely',
        workerId: user.id 
      },
      { status: 200 }
    );

  } catch (err) {
    console.error('API Route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
        }
