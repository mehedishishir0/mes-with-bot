import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { dhakaToday, resolveMealCount } from '@/lib/meal-calendar'

const expenseSchema = z.object({ action: z.literal('expense'), memberId: z.string(), category: z.string().trim().min(1).max(60), amount: z.number().finite().min(0) })
const mealQuantity = z.number().int().min(0).refine(Number.isSafeInteger, 'Meal count is too large')
const mealSchema = z.object({ action: z.literal('meal'), dayId: z.string(), memberId: z.string(), lunchCount: mealQuantity, dinnerCount: mealQuantity })
const utilitySchema = z.object({ action: z.literal('utility'), id: z.string().optional(), name: z.string().trim().min(1).max(60), amount: z.number().finite().min(0) })
const memberSchema = z.object({ action: z.literal('member'), name: z.string().trim().min(1).max(60), externalId: z.string().optional(), phone: z.string().trim().optional().nullable(), whatsappLid: z.string().regex(/^\d{0,20}$/).optional().nullable(), houseRent: z.number().finite().min(0).optional() })
const memberUpdateSchema = z.object({ action: z.literal('memberUpdate'), memberId: z.string(), name: z.string().trim().min(1).max(60).optional(), phone: z.string().trim().optional().nullable(), whatsappLid: z.string().regex(/^\d{0,20}$/).optional().nullable() })
const memberRemoveSchema = z.object({ action: z.literal('memberRemove'), memberId: z.string() })
const utilityRemoveSchema = z.object({ action: z.literal('utilityRemove'), id: z.string() })
const overrideSchema = z.object({ action: z.literal('override'), memberId: z.string(), utilities: z.number().finite().min(0).nullable().optional(), mealRate: z.number().finite().min(0).nullable().optional() })
const rentSchema = z.object({ action: z.literal('rent'), memberId: z.string(), houseRent: z.number().finite().min(0) })
const actualGrocerySchema = z.object({ action: z.literal('actualGrocery'), amount: z.number().finite().min(0).nullable().optional(), note: z.string().optional() })
const marketDutySchema = z.object({ action: z.literal('marketDuty'), id: z.string().optional(), memberId: z.string(), startDay: z.number().int().min(1).max(31), endDay: z.number().int().min(1).max(31), note: z.string().optional().nullable() })
const marketDutyRemoveSchema = z.object({ action: z.literal('marketDutyRemove'), id: z.string() })
const bodySchema = z.discriminatedUnion('action', [expenseSchema, mealSchema, utilitySchema, memberSchema, memberUpdateSchema, memberRemoveSchema, utilityRemoveSchema, overrideSchema, rentSchema, actualGrocerySchema, marketDutySchema, marketDutyRemoveSchema])

function requestedMonth(request: Request) {
  const monthKey = new URL(request.url).searchParams.get('month') ?? dhakaToday().slice(0, 7)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ? monthKey : null
}

function getMonthDays(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const days = [] as Array<{ date: string; label: string }>
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let current = new Date(firstDay)
  while (current.getUTCMonth() === firstDay.getUTCMonth()) {
    days.push({
      date: String(current.getUTCDate()).padStart(2, '0'),
      label: weekdayNames[current.getUTCDay()],
    })
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

async function ensureMonthDays(messId: string, monthKey: string) {
  const count = await prisma.mealDay.count({ where: { messId, monthKey } })
  if (count > 0) return
  const monthDays = getMonthDays(monthKey)
  await prisma.mealDay.createMany({
    data: monthDays.map((day) => ({
      messId,
      monthKey,
      date: day.date,
      label: day.label,
    })),
  })
}

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const monthKey = requestedMonth(request)
    if (!monthKey) return NextResponse.json({ error: 'Invalid month' }, { status: 400 })

    await ensureMonthDays(session.messId, monthKey)

    const data = await prisma.mess.findUnique({
      where: { id: session.messId },
      include: {
        members: {
          select: {
            id: true,
            messId: true,
            externalId: true,
            name: true,
            initials: true,
            color: true,
            phone: true,
            whatsappLid: true,
            houseRent: true,
          },
        },
        days: {
          where: { monthKey },
          include: { entries: true },
          orderBy: { date: 'asc' },
        },
        expenses: {
          where: { monthKey },
        },
        utilities: {
          where: { monthKey },
        },
        overrides: {
          where: { monthKey },
        },
        houseRents: {
          where: { monthKey },
        },
        actualGroceries: {
          where: { monthKey },
        },
        marketDuties: {
          where: { monthKey },
          include: { member: true },
          orderBy: { startDay: 'asc' },
        },
      },
    })

    if (!data) {
      return NextResponse.json({ error: 'Mess not found' }, { status: 404 })
    }

    const days = data.days.map((day) => {
      const manualEntries = new Map(day.entries.map((entry) => [entry.memberId, entry]))
      const entries = data.members.map((member) => {
        const manual = manualEntries.get(member.id)
        return {
          memberId: member.id,
          ...resolveMealCount({ manual }),
        }
      })
      return { ...day, entries }
    })

    return NextResponse.json({ ...data, days })
  } catch (error) {
    console.error('messflow GET error:', error)
    return NextResponse.json({ error: 'Unable to load data from MongoDB' }, { status: 500 })
  }
}

async function handleMutation(request: Request) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const monthKey = requestedMonth(request)
    if (!monthKey) return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    const input = bodySchema.parse(await request.json())
    const mess = await prisma.mess.findUnique({ where: { id: session.messId } })
    if (!mess) {
      return NextResponse.json({ error: 'Mess not found' }, { status: 404 })
    }

    await ensureMonthDays(mess.id, monthKey)

    if (input.action === 'meal') {
      const count = input.lunchCount + input.dinnerCount
      if (!Number.isSafeInteger(count)) return NextResponse.json({ error: 'Meal count is too large' }, { status: 400 })
      const [day, member] = await Promise.all([
        prisma.mealDay.findUnique({ where: { messId_monthKey_date: { messId: mess.id, monthKey, date: input.dayId } } }),
        prisma.member.findUnique({ where: { messId_externalId: { messId: mess.id, externalId: input.memberId } } }),
      ])
      if (!day || !member) throw new Error('Meal record not found')
      await prisma.mealEntry.upsert({
        where: { dayId_memberId: { dayId: day.id, memberId: member.id } },
        update: { count, lunchCount: input.lunchCount, dinnerCount: input.dinnerCount },
        create: { dayId: day.id, memberId: member.id, count, lunchCount: input.lunchCount, dinnerCount: input.dinnerCount },
      })
    }

    if (input.action === 'expense') {
      const member = await prisma.member.findUniqueOrThrow({ where: { messId_externalId: { messId: mess.id, externalId: input.memberId } } })
      await prisma.expense.deleteMany({
        where: { messId: mess.id, monthKey, memberId: member.id, category: input.category },
      })
      await prisma.expense.create({
        data: { messId: mess.id, monthKey, memberId: member.id, category: input.category, amount: input.amount },
      })
    }

    if (input.action === 'utility') {
      await prisma.utility.upsert({
        where: { messId_monthKey_externalId: { messId: mess.id, monthKey, externalId: input.id ?? input.name.toLowerCase().replaceAll(' ', '-') } },
        update: { name: input.name, amount: input.amount },
        create: { messId: mess.id, monthKey, externalId: input.id ?? input.name.toLowerCase().replaceAll(' ', '-'), name: input.name, amount: input.amount },
      })
    }

    if (input.action === 'member') {
      const extId = input.externalId || `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
      const newMember = await prisma.member.create({
        data: {
          messId: mess.id,
          externalId: extId,
          name: input.name,
          initials: input.name.slice(0, 2).toUpperCase(),
          color: 'bg-primary',
          phone: input.phone ? input.phone.trim() : null,
          whatsappLid: input.whatsappLid || null,
          houseRent: input.houseRent ?? 0,
        },
      })
      if (typeof input.houseRent === 'number' && input.houseRent >= 0) {
        await prisma.houseRent.deleteMany({
          where: { messId: mess.id, memberId: newMember.id, monthKey },
        })
        await prisma.houseRent.create({
          data: {
            messId: mess.id,
            memberId: newMember.id,
            amount: input.houseRent,
            monthKey,
          },
        })
      }
    }

    if (input.action === 'memberUpdate') {
      const updateData: Record<string, unknown> = {}
      if (input.name) {
        updateData.name = input.name
        updateData.initials = input.name.slice(0, 2).toUpperCase()
      }
      if (input.phone !== undefined) {
        updateData.phone = input.phone ? input.phone.trim() : null
      }
      if (input.whatsappLid !== undefined) {
        updateData.whatsappLid = input.whatsappLid || null
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.member.updateMany({
          where: { messId: mess.id, externalId: input.memberId },
          data: updateData,
        })
      }
    }

    if (input.action === 'memberRemove') {
      await prisma.member.deleteMany({
        where: { messId: mess.id, externalId: input.memberId },
      })
    }

    if (input.action === 'utilityRemove') {
      await prisma.utility.deleteMany({ where: { messId: mess.id, monthKey, externalId: input.id } })
    }

    if (input.action === 'override') {
      const member = await prisma.member.findUniqueOrThrow({ where: { messId_externalId: { messId: mess.id, externalId: input.memberId } } })
      await prisma.override.deleteMany({
        where: { messId: mess.id, monthKey, memberId: member.id },
      })
      if ((input.utilities !== null && input.utilities !== undefined) || (input.mealRate !== null && input.mealRate !== undefined)) {
        await prisma.override.create({
          data: {
            messId: mess.id,
            monthKey,
            memberId: member.id,
            utilities: input.utilities ?? null,
            mealRate: input.mealRate ?? null,
          },
        })
      }
    }

    if (input.action === 'rent') {
      const member = await prisma.member.findUniqueOrThrow({ where: { messId_externalId: { messId: mess.id, externalId: input.memberId } } })
      await prisma.houseRent.deleteMany({
        where: { messId: mess.id, memberId: member.id, monthKey },
      })
      await prisma.houseRent.create({
        data: {
          messId: mess.id,
          memberId: member.id,
          amount: input.houseRent,
          monthKey,
        },
      })
      await prisma.member.update({
        where: { id: member.id },
        data: { houseRent: input.houseRent },
      })
    }

    if (input.action === 'actualGrocery') {
      await prisma.actualGrocery.upsert({
        where: { messId_monthKey: { messId: mess.id, monthKey } },
        update: { amount: input.amount ?? null, note: input.note ?? null },
        create: { messId: mess.id, monthKey, amount: input.amount ?? null, note: input.note ?? null },
      })
    }

    if (input.action === 'marketDuty') {
      const member = await prisma.member.findUniqueOrThrow({ where: { messId_externalId: { messId: mess.id, externalId: input.memberId } } })
      const sDay = Math.min(input.startDay, input.endDay)
      const eDay = Math.max(input.startDay, input.endDay)

      // Fetch existing duties to resolve overlaps for strict 1 person per date
      const existingDuties = await prisma.marketDuty.findMany({
        where: { messId: mess.id, monthKey },
      })

      for (const ex of existingDuties) {
        if (input.id && ex.id === input.id) continue;

        const overlaps = Math.max(ex.startDay, sDay) <= Math.min(ex.endDay, eDay);
        if (overlaps) {
          if (sDay <= ex.startDay && ex.endDay <= eDay) {
            // Completely covered -> Delete
            await prisma.marketDuty.delete({ where: { id: ex.id } });
          } else if (ex.startDay < sDay && ex.endDay <= eDay) {
            // Truncate end
            await prisma.marketDuty.update({
              where: { id: ex.id },
              data: { endDay: sDay - 1 },
            });
          } else if (sDay <= ex.startDay && eDay < ex.endDay) {
            // Truncate start
            await prisma.marketDuty.update({
              where: { id: ex.id },
              data: { startDay: eDay + 1 },
            });
          } else if (ex.startDay < sDay && eDay < ex.endDay) {
            // Spans over -> Split into two
            const originalEnd = ex.endDay;
            await prisma.marketDuty.update({
              where: { id: ex.id },
              data: { endDay: sDay - 1 },
            });
            await prisma.marketDuty.create({
              data: {
                messId: mess.id,
                monthKey,
                memberId: ex.memberId,
                startDay: eDay + 1,
                endDay: originalEnd,
                note: ex.note,
              },
            });
          }
        }
      }

      if (input.id) {
        await prisma.marketDuty.updateMany({
          where: { id: input.id, messId: mess.id },
          data: {
            memberId: member.id,
            startDay: sDay,
            endDay: eDay,
            note: input.note ?? null,
          },
        })
      } else {
        await prisma.marketDuty.create({
          data: {
            messId: mess.id,
            monthKey,
            memberId: member.id,
            startDay: sDay,
            endDay: eDay,
            note: input.note ?? null,
          },
        })
      }
    }

    if (input.action === 'marketDutyRemove') {
      await prisma.marketDuty.deleteMany({
        where: { messId: mess.id, id: input.id },
      })
    }

    return await GET(request)
  } catch (error) {
    console.error('messflow POST error:', error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Unable to save data to MongoDB' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return handleMutation(request)
}

export async function PUT(request: Request) {
  return handleMutation(request)
}

export async function DELETE(request: Request) {
  return handleMutation(request)
}
