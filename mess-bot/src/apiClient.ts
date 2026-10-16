import { CONFIG } from './config.js'

export type VotePayload = {
  phone: string
  mealType: 'lunch' | 'dinner'
  count: number
  date?: string
  groupId?: string
}

export type VoteResponse = {
  success: boolean
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

  async sendVote(payload: VotePayload): Promise<VoteResponse> {
    const url = `${this.baseUrl}/api/bot/vote`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': this.secretKey,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP error ${res.status}`,
        }
      }
      return data
    } catch (err) {
      console.error('[ApiClient] Error sending vote to website:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      }
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
        headers: {
          'x-bot-secret': this.secretKey,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP error ${res.status}`,
        }
      }
      return data
    } catch (err) {
      console.error('[ApiClient] Error getting summary from website:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      }
    }
  }
}

export const apiClient = new ApiClient()
