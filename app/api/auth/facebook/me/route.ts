import { NextResponse } from 'next/server';
import { listTokens } from '@/lib/facebookStore';

export async function GET(request: Request) {
  // Return a list of linked Facebook accounts (MVP)
  const tokens = listTokens();
  return NextResponse.json({ success: true, accounts: tokens });
}
