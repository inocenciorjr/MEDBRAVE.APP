import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('localhost', '127.0.0.1') || 'http://127.0.0.1:5000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = `${BACKEND_URL}/api/flashcards`;

    console.log(`[Proxy /api/flashcards] POST to backend:`, url);

    const body = await request.text();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    console.log(`[Proxy /api/flashcards] Backend response status:`, response.status);

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`[Proxy /api/flashcards] Backend response data:`, data);
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'text/plain',
      },
    });
  } catch (error) {
    console.error('[Proxy /api/flashcards] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/flashcards${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/flashcards] GET from backend:`, url);

    const headers: HeadersInit = {};

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log(`[Proxy /api/flashcards] Backend response status:`, response.status);

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'text/plain',
      },
    });
  } catch (error) {
    console.error('[Proxy /api/flashcards] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
