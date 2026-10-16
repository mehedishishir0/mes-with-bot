import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, writeSessionCookie } from '@/lib/auth'

const signupSchema = z.object({
  messName: z.string().trim().min(2).max(80),
  managerName: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(120),
  confirmPassword: z.string().min(6).max(120),
})

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json())

    if (body.password !== body.confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    const trimmedEmail = body.email.trim()
    const lowerEmail = trimmedEmail.toLowerCase()

    const existing = await prisma.mess.findFirst({
      where: {
        OR: [
          { email: lowerEmail },
          { email: trimmedEmail }
        ]
      }
    })
    if (existing) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(body.password, 10)

    const mess = await prisma.mess.create({
      data: {
        messName: body.messName,
        managerName: body.managerName,
        email: lowerEmail,
        password: hashedPassword,
      },
    })

    const sessionPayload = {
      id: mess.id,
      messId: mess.id,
      messName: mess.messName,
      managerName: mess.managerName,
      email: mess.email,
    }

    const response = NextResponse.json({ ok: true, mess: { id: mess.id, messName: mess.messName } })
    response.cookies.set({
      name: SESSION_COOKIE,
      value: writeSessionCookie(sessionPayload),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('[POST /api/auth/signup] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Unable to create mess account' }, { status: 500 })
  }
}
