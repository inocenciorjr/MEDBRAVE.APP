import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.text();
    
    console.log('[Proxy /api/error-notebook] POST (root)');
    console.log('[Proxy /api/error-notebook] Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('[Proxy /api/error-notebook] Body:', body);

    const response = await fetch(`${BACKEND_URL}/api/error-notebook`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy /api/error-notebook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
