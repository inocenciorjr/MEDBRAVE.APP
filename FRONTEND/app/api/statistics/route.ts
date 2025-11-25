import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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

async function handleRequest(request: NextRequest, method: string) {
  try {
    const authHeader = request.headers.get('authorization');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/statistics${searchParams ? `?${searchParams}` : ''}`;

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

    console.log(`[Proxy /api/statistics] Fetching from backend: ${url}`);
    const response = await fetch(url, options);
    console.log(`[Proxy /api/statistics] Backend response status:`, response.status);

    // Tentar parsear como JSON
    const contentTypeResponse = response.headers.get('content-type');
    if (contentTypeResponse?.includes('application/json')) {
      const data = await response.json();
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
    console.error('[Proxy /api/statistics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
