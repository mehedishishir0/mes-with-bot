import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const linkSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-F0-9]{16}$/),
  senderJid: z.string().regex(/^\d+@lid$/),
  groupId: z.string().regex(/^\d+@g\.us$/),
})

export async function POST(request: Request) {
  const secret = process.env.BOT_SECRET_KEY
  if (!secret || request.headers.get('x-bot-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = linkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'লিংক কোড বা WhatsApp পরিচয় সঠিক নয়।' }, { status: 400 })

  const { code, senderJid, groupId } = parsed.data
  const codeHash = createHash('sha256').update(code).digest('hex')
  const member = await prisma.member.findFirst({
    where: { linkCodeHash: codeHash, linkCodeExpiresAt: { gt: new Date() }, mess: { whatsappGroupId: groupId } },
  })
  if (!member) {
    return NextResponse.json({ error: 'কোডটি ভুল বা মেয়াদ শেষ। নতুন কোড নিন।' }, { status: 404 })
  }

  const lid = senderJid.slice(0, -4)
  const existing = await prisma.member.findFirst({
    where: { messId: member.messId, whatsappLid: lid, id: { not: member.id } },
    select: { id: true },
  })
  if (existing) return NextResponse.json({ error: 'এই WhatsApp অ্যাকাউন্টটি অন্য মেম্বারের সঙ্গে যুক্ত আছে।' }, { status: 409 })

  const claimed = await prisma.member.updateMany({
    where: { id: member.id, linkCodeHash: codeHash, linkCodeExpiresAt: { gt: new Date() } },
    data: { whatsappLid: lid, linkCodeHash: null, linkCodeExpiresAt: null },
  })
  if (claimed.count !== 1) return NextResponse.json({ error: 'কোডটি ইতিমধ্যে ব্যবহার হয়েছে।' }, { status: 409 })

  return NextResponse.json({ success: true, memberName: member.name })
}
