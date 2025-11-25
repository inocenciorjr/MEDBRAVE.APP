import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = `${BACKEND_URL}/api/reviews/overdue-count`;

    const headers: HeadersInit = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    console.log(`[Proxy /api/reviews/overdue-count] Fetching from backend: ${url}`);
    const response = await fetch(url, { headers });
    console.log(`[Proxy /api/reviews/overdue-count] Backend response status:`, response.status);

    const data = await response.json();
    console.log(`[Proxy /api/reviews/overdue-count] Backend response data:`, data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy /api/reviews/overdue-count] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
