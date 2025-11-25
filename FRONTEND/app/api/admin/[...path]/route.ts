import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, path, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const authHeader = request.headers.get('authorization');
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api/admin/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[Proxy /api/admin] ${method} ${path}`);
    console.log(`[Proxy /api/admin] Auth header:`, authHeader ? 'Present' : 'Missing');

    // SSE routes use token as query parameter instead of Authorization header
    const isSSERoute = path.includes('/progress') && searchParams.includes('token=');
    
    if (!authHeader && !isSSERoute) {
      console.log(`[Proxy /api/admin] ERROR: Authorization header missing`);
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

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

    const response = await fetch(url, options);

    // Se for streaming (text/event-stream), retornar o stream diretamente
    const contentTypeResponse = response.headers.get('content-type');
    if (contentTypeResponse?.includes('text/event-stream') || contentTypeResponse?.includes('application/stream')) {
      console.log(`[Proxy /api/admin] Streaming response detected`);
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': contentTypeResponse,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Status 204 não deve ter body
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // Tentar parsear como JSON
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
    console.error('[Proxy /api/admin] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
