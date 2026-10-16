import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export type MessSession = {
  id: string
  messId: string
  messName: string
  managerName: string
  email: string
}

export const SESSION_COOKIE = 'messflow_session'

const JWT_SECRET = process.env.MESSFLOW_JWT_SECRET ?? 'development-messflow-secret'

function isPayload(value: unknown): value is MessSession {
  return Boolean(value && typeof value === 'object' && 'messId' in value)
}

export async function getServerSession(): Promise<MessSession | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value

  if (!cookieValue) return null

  try {
    const payload = jwt.verify(cookieValue, JWT_SECRET) as unknown
    if (!isPayload(payload)) return null
    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(request: Request | NextRequest): MessSession | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`))
  const cookieValue = match?.[1]

  if (!cookieValue) return null

  try {
    const payload = jwt.verify(decodeURIComponent(cookieValue), JWT_SECRET) as unknown
    if (!isPayload(payload)) return null
    return payload
  } catch {
    return null
  }
}

export function writeSessionCookie(payload: MessSession) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
