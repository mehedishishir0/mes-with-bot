import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const connectSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-F0-9]{16}$/),
  groupId: z.string().regex(/^\d+@g\.us$/),
  groupName: z.string().trim().min(1).max(160).optional(),
})

export async function POST(request: Request) {
  const secret = process.env.BOT_SECRET_KEY
  if (!secret || request.headers.get('x-bot-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = connectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'কোড বা গ্রুপের তথ্য সঠিক নয়।' }, { status: 400 })

  const { code, groupId, groupName } = parsed.data
  const codeHash = createHash('sha256').update(code).digest('hex')
  const mess = await prisma.mess.findFirst({
    where: { groupConnectCodeHash: codeHash, groupConnectCodeExpiresAt: { gt: new Date() } },
    select: { id: true, messName: true },
  })
  if (!mess) return NextResponse.json({ error: 'কোডটি ভুল বা মেয়াদ শেষ। ওয়েবসাইট থেকে নতুন কোড নিন।' }, { status: 404 })

  const alreadyConnected = await prisma.mess.findFirst({
    where: { whatsappGroupId: groupId, id: { not: mess.id } },
    select: { messName: true },
  })
  if (alreadyConnected) {
    return NextResponse.json({ error: `এই গ্রুপটি ইতিমধ্যে ${alreadyConnected.messName} মেসের সঙ্গে যুক্ত আছে।` }, { status: 409 })
  }

  const claimed = await prisma.mess.updateMany({
    where: { id: mess.id, groupConnectCodeHash: codeHash, groupConnectCodeExpiresAt: { gt: new Date() } },
    data: {
      whatsappGroupId: groupId,
      whatsappGroupName: groupName ?? null,
      groupConnectCodeHash: null,
      groupConnectCodeExpiresAt: null,
    },
  })
  if (claimed.count !== 1) return NextResponse.json({ error: 'কোডটি ইতিমধ্যে ব্যবহার হয়েছে। নতুন কোড নিন।' }, { status: 409 })

  return NextResponse.json({ success: true, messName: mess.messName })
}
