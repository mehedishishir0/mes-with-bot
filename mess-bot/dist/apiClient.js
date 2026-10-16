"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClient = void 0;
const config_js_1 = require("./config.js");
class ApiClient {
    baseUrl;
    secretKey;
    constructor() {
        this.baseUrl = config_js_1.CONFIG.WEBSITE_API_URL;
        this.secretKey = config_js_1.CONFIG.BOT_SECRET_KEY;
    }
    async sendVote(payload) {
        const url = `${this.baseUrl}/api/bot/vote`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-bot-secret': this.secretKey,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP error ${res.status}`,
                };
            }
            return data;
        }
        catch (err) {
            console.error('[ApiClient] Error sending vote to website:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Network error',
            };
        }
    }
    async getSummary(date, mealType, groupId) {
        const params = new URLSearchParams();
        if (date)
            params.set('date', date);
        if (mealType)
            params.set('mealType', mealType);
        if (groupId)
            params.set('groupId', groupId);
        const url = `${this.baseUrl}/api/bot/vote?${params.toString()}`;
        try {
            const res = await fetch(url, {
                headers: {
                    'x-bot-secret': this.secretKey,
                },
            });
            const data = await res.json();
            if (!res.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP error ${res.status}`,
                };
            }
            return data;
        }
        catch (err) {
            console.error('[ApiClient] Error getting summary from website:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Network error',
            };
        }
    }
}
exports.ApiClient = ApiClient;
exports.apiClient = new ApiClient();
