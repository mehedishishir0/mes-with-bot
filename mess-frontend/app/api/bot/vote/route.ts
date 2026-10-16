import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { dhakaToday, validDate } from '@/lib/meal-calendar'

const voteSchema = z.object({
  phone: z.string().trim().min(5),
  mealType: z.enum(['lunch', 'dinner']),
  count: z.number().int().min(0).max(10),
  date: z.string().refine(validDate, 'Invalid date format').optional(),
  groupId: z.string().optional(),
})

function normalizePhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    return `0${last10}`
  }
  return digits
}

function verifyAuth(request: Request) {
  const secretKey = process.env.BOT_SECRET_KEY || 'mess_bot_secret_2026'
  const headerSecret = request.headers.get('x-bot-secret')
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')

  return (
    headerSecret === secretKey ||
    bearerToken === secretKey ||
    querySecret === secretKey
  )
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function POST(request: Request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid bot secret key' }, { status: 401 })
    }

    const json = await request.json()
    const input = voteSchema.parse(json)

    const normalized = normalizePhone(input.phone)
    const phoneVariants = [
      normalized,
      `+88${normalized}`,
      `88${normalized}`,
      normalized.replace(/^0/, ''),
    ]

    // Find member by phone
    const member = await prisma.member.findFirst({
      where: {
        phone: { in: phoneVariants },
        ...(input.groupId ? { mess: { whatsappGroupId: input.groupId } } : {}),
      },
      include: {
        mess: true,
      },
    })

    if (!member) {
      return NextResponse.json(
        {
          error: `মেম্বার পাওয়া যায়নি! ফোন নাম্বার (${input.phone}) কি ওয়েবসাইটে যুক্ত করা আছে?`,
          normalizedPhone: normalized,
        },
        { status: 404 }
      )
    }

    const date = input.date ?? dhakaToday()
    const monthKey = date.slice(0, 7)
    const dayStr = date.slice(8, 10)

    // Ensure MealDay exists
    const dayDate = new Date(`${date}T00:00:00.000Z`)
    const label = weekdayNames[dayDate.getUTCDay()] ?? 'Day'

    const day = await prisma.mealDay.upsert({
      where: {
        messId_monthKey_date: {
          messId: member.messId,
          monthKey,
          date: dayStr,
        },
      },
      create: {
        messId: member.messId,
        monthKey,
        date: dayStr,
        label,
      },
      update: {},
    })

    // Find existing meal entry
    const existingEntry = await prisma.mealEntry.findUnique({
      where: {
        dayId_memberId: {
          dayId: day.id,
          memberId: member.id,
        },
      },
    })

    let lunchCount = existingEntry?.lunchCount ?? 0
    let dinnerCount = existingEntry?.dinnerCount ?? 0

    if (input.mealType === 'lunch') {
      lunchCount = input.count
    } else {
      dinnerCount = input.count
    }

    const totalCount = lunchCount + dinnerCount

    const updatedEntry = await prisma.mealEntry.upsert({
      where: {
        dayId_memberId: {
          dayId: day.id,
          memberId: member.id,
        },
      },
      create: {
        dayId: day.id,
        memberId: member.id,
        count: totalCount,
        lunchCount,
        dinnerCount,
      },
      update: {
        count: totalCount,
        lunchCount,
        dinnerCount,
      },
    })

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
      },
      date,
      mealType: input.mealType,
      updated: {
        lunchCount,
        dinnerCount,
        total: totalCount,
      },
      entry: updatedEntry,
    })
  } catch (error) {
    console.error('Bot vote error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'অভ্যন্তরীণ সার্ভার এরর' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid bot secret key' }, { status: 401 })
    }

    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? dhakaToday()
    const mealType = url.searchParams.get('mealType') as 'lunch' | 'dinner' | null
    const groupId = url.searchParams.get('groupId')

    const monthKey = date.slice(0, 7)
    const dayStr = date.slice(8, 10)

    const mess = await prisma.mess.findFirst({
      where: groupId ? { whatsappGroupId: groupId } : {},
      include: {
        members: {
          select: {
            id: true,
            name: true,
            phone: true,
            initials: true,
          },
        },
        days: {
          where: { monthKey, date: dayStr },
          include: {
            entries: true,
          },
        },
      },
    })

    if (!mess) {
      return NextResponse.json({ error: 'Mess not found' }, { status: 404 })
    }

    const day = mess.days[0]
    type EntryRecord = { memberId: string; lunchCount?: number | null; dinnerCount?: number | null }
    const entriesMap = new Map<string, EntryRecord>(
      (day?.entries ?? []).map((e: any) => [e.memberId, e])
    )

    const membersSummary = mess.members.map((m: any) => {
      const entry = entriesMap.get(m.id)
      const lunch = entry?.lunchCount ?? 0
      const dinner = entry?.dinnerCount ?? 0
      return {
        id: m.id,
        name: m.name,
        phone: m.phone,
        lunch,
        dinner,
        total: lunch + dinner,
      }
    })

    const totalLunch = membersSummary.reduce((sum: number, m: { lunch: number }) => sum + m.lunch, 0)
    const totalDinner = membersSummary.reduce((sum: number, m: { dinner: number }) => sum + m.dinner, 0)

    return NextResponse.json({
      success: true,
      messName: mess.messName,
      date,
      mealType,
      summary: {
        totalLunch,
        totalDinner,
        membersCount: mess.members.length,
        votedCount: membersSummary.filter((m: { lunch: number; dinner: number }) => (mealType === 'lunch' ? m.lunch > 0 : m.dinner > 0)).length,
      },
      members: membersSummary,
    })
  } catch (error) {
    console.error('Bot summary error:', error)
    return NextResponse.json({ error: 'অভ্যন্তরীণ সার্ভার এরর' }, { status: 500 })
  }
}
