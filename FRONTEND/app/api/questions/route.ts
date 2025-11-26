import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/config';

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request, 'PATCH');
}

async function handleRequest(request: NextRequest, method: string) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/questions${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/questions] ${method} (root)`);
    console.log(`[Proxy /api/questions] Backend URL:`, url);
    console.log(`[Proxy /api/questions] Auth header:`, authHeader ? 'Present' : 'Missing');

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

    // Adicionar body para métodos que suportam
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    console.log(`[Proxy /api/questions] Fetching from backend...`);
    const response = await fetch(url, options);
    console.log(`[Proxy /api/questions] Backend response status:`, response.status);

    // Tentar parsear como JSON
    const contentTypeResponse = response.headers.get('content-type');
    if (contentTypeResponse?.includes('application/json')) {
      const data = await response.json();
      console.log(`[Proxy /api/questions] Backend response data (first 100 chars):`, JSON.stringify(data).substring(0, 100));
      return NextResponse.json(data, { status: response.status });
    }

    // Se não for JSON, retornar como texto
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': contentTypeResponse || 'text/plain',
      },
    });
  } catch (error) {
    console.error('[Proxy /api/questions] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
