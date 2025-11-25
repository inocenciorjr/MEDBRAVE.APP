import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/review-preferences`;
        const authHeader = request.headers.get('authorization');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader || '',
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Erro no proxy review-preferences:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/review-preferences`;
        const authHeader = request.headers.get('authorization');
        const body = await request.json();

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Erro no proxy review-preferences:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/review-preferences`;
        const authHeader = request.headers.get('authorization');
        const body = await request.json();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Erro no proxy review-preferences:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const url = `${BACKEND_URL}/api/review-preferences`;
        const authHeader = request.headers.get('authorization');

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': authHeader || '',
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Erro no proxy review-preferences:', error);
        return NextResponse.json(
            { success: false, message: 'Erro ao processar requisição' },
            { status: 500 }
        );
    }
}
