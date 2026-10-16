import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const secret = process.env.BOT_SECRET_KEY
  if (!secret || request.headers.get('x-bot-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const groups = await prisma.mess.findMany({
    where: { whatsappGroupId: { not: null } },
    select: { whatsappGroupId: true, whatsappGroupName: true },
  })
  return NextResponse.json({
    success: true,
    groups: groups.flatMap((group) => group.whatsappGroupId ? [{ id: group.whatsappGroupId, name: group.whatsappGroupName }] : []),
  })
}
