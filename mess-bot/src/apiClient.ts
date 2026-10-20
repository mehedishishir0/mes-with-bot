import { CONFIG } from './config.js'

export type VotePayload = {
  voterJid: string
  mealType: 'lunch' | 'dinner'
  count: number
  date?: string
  groupId?: string
}

export type LinkResponse = { success: boolean; memberName?: string; error?: string }
export type MemberResponse = { success: boolean; memberName?: string; error?: string }
export type GroupConnectResponse = { success: boolean; messName?: string; error?: string }
export type ConnectedGroupsResponse = { success: boolean; groups?: Array<{ id: string; name?: string | null }>; error?: string }

export type VoteResponse = {
  success: boolean
  locked?: boolean
  memberName?: string
  member?: {
    id: string
    name: string
    phone: string
  }
  mealType?: string
  updated?: {
    lunchCount: number
    dinnerCount: number
    total: number
  }
  error?: string
}

export type SummaryResponse = {
  success: boolean
  messName?: string
  date?: string
  mealType?: string
  summary?: {
    totalLunch: number
    totalDinner: number
    membersCount: number
    votedCount: number
  }
  members?: Array<{
    id: string
    name: string
    phone: string | null
    lunch: number
    dinner: number
    total: number
  }>
  error?: string
}

export class ApiClient {
  private baseUrl: string
  private secretKey: string

  constructor() {
    this.baseUrl = CONFIG.WEBSITE_API_URL
    this.secretKey = CONFIG.BOT_SECRET_KEY
  }

  private async readJson<T extends { success: boolean; error?: string }>(res: Response, url: string): Promise<T> {
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return { success: false, error: `${url} returned HTTP ${res.status} (${contentType || 'no content type'}); check WEBSITE_API_URL and API routing` } as T
    }
    const data = await res.json() as T
    if (!res.ok) return { ...data, success: false, error: data.error || `HTTP ${res.status}` }
    return data
  }

  async sendVote(payload: VotePayload): Promise<VoteResponse> {
    const url = `${this.baseUrl}/api/bot/vote`
    try {
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': this.secretKey,
        },
        body: JSON.stringify(payload),
      })

      return await this.readJson<VoteResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error sending vote to website:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      }
    }
  }

  async linkMember(code: string, senderJid: string, groupId: string): Promise<LinkResponse> {
    const url = `${this.baseUrl}/api/bot/link`
    try {
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json', 'x-bot-secret': this.secretKey },
        body: JSON.stringify({ code, senderJid, groupId }),
      })
      return await this.readJson<LinkResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error linking member:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  }

  async connectGroup(code: string, groupId: string, groupName?: string): Promise<GroupConnectResponse> {
    const url = `${this.baseUrl}/api/bot/group-connect`
    try {
      const res = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json', 'x-bot-secret': this.secretKey },
        body: JSON.stringify({ code, groupId, groupName }),
      })
      return await this.readJson<GroupConnectResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error connecting group:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  }

  async getConnectedGroups(): Promise<ConnectedGroupsResponse> {
    const url = `${this.baseUrl}/api/bot/groups`
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { 'x-bot-secret': this.secretKey } })
      return await this.readJson<ConnectedGroupsResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error loading connected groups:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  }

  async getMember(voterJid: string, groupId: string): Promise<MemberResponse> {
    const params = new URLSearchParams({ voterJid, groupId })
    const url = `${this.baseUrl}/api/bot/member?${params}`
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: { 'x-bot-secret': this.secretKey },
      })
      return await this.readJson<MemberResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error looking up member:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  }

  async getSummary(date?: string, mealType?: 'lunch' | 'dinner', groupId?: string): Promise<SummaryResponse> {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (mealType) params.set('mealType', mealType)
    if (groupId) params.set('groupId', groupId)

    const url = `${this.baseUrl}/api/bot/vote?${params.toString()}`
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: {
          'x-bot-secret': this.secretKey,
        },
      })
      return await this.readJson<SummaryResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error getting summary from website:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      }
    }
  }

  async getMarketDuties(groupId?: string, date?: string): Promise<MarketDutyResponse> {
    const params = new URLSearchParams()
    if (groupId) params.set('groupId', groupId)
    if (date) params.set('date', date)

    const url = `${this.baseUrl}/api/bot/market-duty?${params.toString()}`
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: {
          'x-bot-secret': this.secretKey,
        },
      })
      return await this.readJson<MarketDutyResponse>(res, url)
    } catch (err) {
      console.error('[ApiClient] Error getting market duties from website:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      }
    }
  }
}

export type MarketDutyMember = {
  id: string
  externalId?: string
  name: string
  phone?: string | null
  whatsappLid?: string | null
  initials?: string
  color?: string
}

export type MarketDutyItem = {
  id: string
  startDay: number
  endDay: number
  totalDays: number
  daysRemaining: number
  note?: string | null
  member: MarketDutyMember
}

export type MarketDutyResponse = {
  success: boolean
  messName?: string
  groupId?: string
  date?: string
  monthKey?: string
  day?: number
  startingDuties?: MarketDutyItem[]
  activeDuties?: MarketDutyItem[]
  allDuties?: MarketDutyItem[]
  groups?: Array<{
    groupId: string
    messName: string
    startingDuties: MarketDutyItem[]
    activeDuties: MarketDutyItem[]
    allDuties: MarketDutyItem[]
  }>
  error?: string
}

export const apiClient = new ApiClient()
