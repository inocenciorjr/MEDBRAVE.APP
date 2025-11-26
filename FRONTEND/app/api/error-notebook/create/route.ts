import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.text();
    
    console.log('[Proxy /api/error-notebook/create] POST');
    console.log('[Proxy /api/error-notebook/create] Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('[Proxy /api/error-notebook/create] Body:', body);

    const response = await fetch(`${BACKEND_URL}/api/error-notebook/create`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
      body,
    });

    console.log('[Proxy /api/error-notebook/create] Backend status:', response.status);
    
    const contentType = response.headers.get('content-type');
    console.log('[Proxy /api/error-notebook/create] Content-Type:', contentType);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log('[Proxy /api/error-notebook/create] Response:', data);
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      console.error('[Proxy /api/error-notebook/create] Non-JSON response:', text);
      return NextResponse.json(
        { error: 'Backend returned non-JSON response', details: text.substring(0, 200) },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[Proxy /api/error-notebook/create] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
