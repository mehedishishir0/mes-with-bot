import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const secret = process.env.BOT_SECRET_KEY
  if (!secret || request.headers.get('x-bot-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const voterJid = searchParams.get('voterJid') || ''
  const groupId = searchParams.get('groupId') || ''
  if (!/^\d+@lid$/.test(voterJid) || !/^\d+@g\.us$/.test(groupId)) {
    return NextResponse.json({ error: 'Invalid voter or group' }, { status: 400 })
  }

  const member = await prisma.member.findFirst({
    where: { whatsappLid: voterJid.slice(0, -4), mess: { whatsappGroupId: groupId } },
    select: { name: true },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  return NextResponse.json({ success: true, memberName: member.name })
}
