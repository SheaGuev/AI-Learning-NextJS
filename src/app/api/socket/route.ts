import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint just confirms the route exists
  // The actual Socket.IO connection is handled by the custom server
  return NextResponse.json({ status: 'Socket route available' });
} 