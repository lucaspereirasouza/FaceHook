import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken, userId } = body;

    // In a real application, you would validate this token with the Facebook Graph API
    // const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
    
    console.log('Received access token for user:', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Facebook account linked successfully',
      userId: userId 
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
