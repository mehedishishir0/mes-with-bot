import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dhakaToday, validDate } from '@/lib/meal-calendar'

function verifyAuth(request: Request) {
  const secretKey = process.env.BOT_SECRET_KEY
  if (!secretKey) return false
  const headerSecret = request.headers.get('x-bot-secret')
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  return headerSecret === secretKey || bearerToken === secretKey
}

export async function GET(request: Request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid bot secret key' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')?.trim() || null
    const dateParam = searchParams.get('date')?.trim() || ''
    const targetDate = validDate(dateParam) ? dateParam : dhakaToday()
    const monthKey = targetDate.slice(0, 7)
    const day = parseInt(targetDate.slice(8, 10), 10)

    if (groupId) {
      const mess = await prisma.mess.findFirst({
        where: { whatsappGroupId: groupId },
        select: {
          id: true,
          messName: true,
          whatsappGroupId: true,
          marketDuties: {
            where: { monthKey },
            include: {
              member: {
                select: {
                  id: true,
                  externalId: true,
                  name: true,
                  phone: true,
                  whatsappLid: true,
                  initials: true,
                  color: true,
                },
              },
            },
            orderBy: { startDay: 'asc' },
          },
        },
      })

      if (!mess) {
        return NextResponse.json({ success: false, error: 'Mess not found for this group' }, { status: 404 })
      }

      const formatDuty = (duty: (typeof mess.marketDuties)[number]) => {
        const totalDays = duty.endDay - duty.startDay + 1
        const daysRemaining = duty.endDay - day + 1
        return {
          id: duty.id,
          startDay: duty.startDay,
          endDay: duty.endDay,
          totalDays,
          daysRemaining: Math.max(0, daysRemaining),
          note: duty.note || null,
          member: {
            id: duty.member.id,
            externalId: duty.member.externalId,
            name: duty.member.name,
            phone: duty.member.phone || null,
            whatsappLid: duty.member.whatsappLid || null,
            initials: duty.member.initials,
            color: duty.member.color,
          },
        }
      }

      const allDuties = mess.marketDuties.map(formatDuty)
      const startingDuties = allDuties.filter((d) => d.startDay === day)
      const activeDuties = allDuties.filter((d) => d.startDay <= day && day <= d.endDay)

      return NextResponse.json({
        success: true,
        messName: mess.messName,
        groupId: mess.whatsappGroupId,
        date: targetDate,
        monthKey,
        day,
        startingDuties,
        activeDuties,
        allDuties,
      })
    }

    // If no specific groupId is provided, return for all messes with connected WhatsApp groups
    const messes = await prisma.mess.findMany({
      where: { whatsappGroupId: { not: null } },
      select: {
        id: true,
        messName: true,
        whatsappGroupId: true,
        marketDuties: {
          where: { monthKey },
          include: {
            member: {
              select: {
                id: true,
                externalId: true,
                name: true,
                phone: true,
                whatsappLid: true,
                initials: true,
                color: true,
              },
            },
          },
          orderBy: { startDay: 'asc' },
        },
      },
    })

    const groups = messes.map((mess) => {
      const formatDuty = (duty: (typeof mess.marketDuties)[number]) => {
        const totalDays = duty.endDay - duty.startDay + 1
        const daysRemaining = duty.endDay - day + 1
        return {
          id: duty.id,
          startDay: duty.startDay,
          endDay: duty.endDay,
          totalDays,
          daysRemaining: Math.max(0, daysRemaining),
          note: duty.note || null,
          member: {
            id: duty.member.id,
            externalId: duty.member.externalId,
            name: duty.member.name,
            phone: duty.member.phone || null,
            whatsappLid: duty.member.whatsappLid || null,
            initials: duty.member.initials,
            color: duty.member.color,
          },
        }
      }

      const allDuties = mess.marketDuties.map(formatDuty)
      const startingDuties = allDuties.filter((d) => d.startDay === day)
      const activeDuties = allDuties.filter((d) => d.startDay <= day && day <= d.endDay)

      return {
        groupId: mess.whatsappGroupId,
        messName: mess.messName,
        startingDuties,
        activeDuties,
        allDuties,
      }
    })

    return NextResponse.json({
      success: true,
      date: targetDate,
      monthKey,
      day,
      groups,
    })
  } catch (error) {
    console.error('[Bot Market Duty API Error]:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
