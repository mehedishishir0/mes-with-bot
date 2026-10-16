import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const code = randomBytes(8).toString('hex').toUpperCase()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await prisma.mess.update({
    where: { id: session.messId },
    data: {
      groupConnectCodeHash: createHash('sha256').update(code).digest('hex'),
      groupConnectCodeExpiresAt: expiresAt,
    },
  })

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() })
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  await prisma.mess.update({
    where: { id: session.messId },
    data: {
      whatsappGroupId: null,
      whatsappGroupName: null,
      groupConnectCodeHash: null,
      groupConnectCodeExpiresAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}
