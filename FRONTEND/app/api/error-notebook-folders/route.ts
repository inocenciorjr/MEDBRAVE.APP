import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

async function handleRequest(request: NextRequest, method: string) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/error-notebook-folders${searchParams ? `?${searchParams}` : ''}`;

    const headers: HeadersInit = {};

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(url, options);
    const responseContentType = response.headers.get('content-type');
    
    if (responseContentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType || 'text/plain',
      },
    });
  } catch (error) {
    console.error('[Proxy /api/error-notebook-folders] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
