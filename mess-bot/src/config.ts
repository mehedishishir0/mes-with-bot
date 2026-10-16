import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

if (!process.env.BOT_SECRET_KEY) throw new Error('BOT_SECRET_KEY is required')

export const CONFIG = {
  WEBSITE_API_URL: (process.env.WEBSITE_API_URL || 'http://localhost:3000').replace(/\/$/, ''),
  BOT_SECRET_KEY: process.env.BOT_SECRET_KEY || '',
  TIMEZONE: process.env.TIMEZONE || 'Asia/Dhaka',
  AUTH_DIR: path.resolve(process.cwd(), 'auth_info'),
}

export function getDhakaDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function getDhakaHourMinute(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return { hour, minute }
}
