import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Tentar pegar o token do header Authorization (requisições client-side)
    let authHeader = request.headers.get('authorization');
    
    // Se não tiver no header, tentar pegar dos cookies (requisições SSR)
    if (!authHeader) {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('sb-access-token')?.value;
      
      if (accessToken) {
        authHeader = `Bearer ${accessToken}`;
      }
    }
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/user/me`, {
      headers: {
        'Authorization': authHeader,
      },
    });
    
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route /api/user/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
