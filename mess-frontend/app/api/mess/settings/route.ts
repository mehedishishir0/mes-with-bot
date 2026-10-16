import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const settingsSchema = z.object({
  messName: z.string().trim().min(2).max(80).optional(),
  managerName: z.string().trim().min(2).max(80).optional(),
  currentPassword: z.string().min(6).max(120).optional(),
  newPassword: z.string().min(6).max(120).optional(),
})

export async function GET(request: Request) {
  const session = getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const mess = await prisma.mess.findUnique({
    where: { id: session.messId },
    select: {
      id: true,
      messName: true,
      managerName: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!mess) {
    return NextResponse.json({ error: 'Mess not found' }, { status: 404 })
  }

  return NextResponse.json({ mess })
}

export async function PUT(request: Request) {
  const session = getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const payload = settingsSchema.parse(await request.json())

    const mess = await prisma.mess.findUnique({ where: { id: session.messId } })
    if (!mess) {
      return NextResponse.json({ error: 'Mess not found' }, { status: 404 })
    }

    const wantsPasswordChange = Boolean(payload.newPassword || payload.currentPassword)

    if (wantsPasswordChange) {
      if (!payload.currentPassword || !payload.newPassword) {
        return NextResponse.json({ error: 'Current password and new password are required to change your password' }, { status: 400 })
      }

      const matches = await bcrypt.compare(payload.currentPassword, mess.password)
      if (!matches) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }

      payload.newPassword = payload.newPassword.trim()
    }

    const updatePayload: { messName?: string; managerName?: string; password?: string } = {}

    if (payload.messName) {
      updatePayload.messName = payload.messName
    }

    if (payload.managerName) {
      updatePayload.managerName = payload.managerName
    }

    if (payload.newPassword) {
      updatePayload.password = await bcrypt.hash(payload.newPassword, 10)
    }

    const updated = await prisma.mess.update({
      where: { id: session.messId },
      data: updatePayload,
      select: {
        id: true,
        messName: true,
        managerName: true,
        email: true,
      },
    })

    return NextResponse.json({ ok: true, mess: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Unable to update mess settings' }, { status: 500 })
  }
}
