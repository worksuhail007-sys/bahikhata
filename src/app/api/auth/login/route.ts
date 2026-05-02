import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const validEmail = process.env.AUTH_EMAIL;
  const validPassword = process.env.AUTH_PASSWORD;

  if (email === validEmail && password === validPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('bk_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
