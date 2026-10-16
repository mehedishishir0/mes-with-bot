import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const requestSchema = z.object({ memberId: z.string().min(1), phone: z.string().trim().min(5) })

export async function POST(request: Request) {
  const session = getSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'আগে মেম্বারের WhatsApp নম্বর লিখুন।' }, { status: 400 })

  const mess = await prisma.mess.findUnique({ where: { id: session.messId }, select: { whatsappGroupId: true } })
  if (!mess?.whatsappGroupId) {
    return NextResponse.json({ error: 'আগে সেটিংসে WhatsApp গ্রুপ ID সেভ করুন।' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({
    where: { messId_externalId: { messId: session.messId, externalId: parsed.data.memberId } },
    select: { id: true },
  })
  if (!member) return NextResponse.json({ error: 'মেম্বার পাওয়া যায়নি।' }, { status: 404 })

  const code = randomBytes(8).toString('hex').toUpperCase()
  const codeHash = createHash('sha256').update(code).digest('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.member.update({
    where: { id: member.id },
    data: { phone: parsed.data.phone, linkCodeHash: codeHash, linkCodeExpiresAt: expiresAt },
  })

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() })
}
