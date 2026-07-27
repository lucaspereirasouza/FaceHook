import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'facebook_token_endpoint_retired' },
    { status: 410 },
  );
}
