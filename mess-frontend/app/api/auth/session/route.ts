import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  return NextResponse.json({ authenticated: true, user: session })
}
