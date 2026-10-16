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
    async readJson(res, url) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return { success: false, error: `${url} returned HTTP ${res.status} (${contentType || 'no content type'}); check WEBSITE_API_URL and API routing` };
        }
        const data = await res.json();
        if (!res.ok)
            return { ...data, success: false, error: data.error || `HTTP ${res.status}` };
        return data;
    }
    async sendVote(payload) {
        const url = `${this.baseUrl}/api/bot/vote`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    'Content-Type': 'application/json',
                    'x-bot-secret': this.secretKey,
                },
                body: JSON.stringify(payload),
            });
            return await this.readJson(res, url);
        }
        catch (err) {
            console.error('[ApiClient] Error sending vote to website:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Network error',
            };
        }
    }
    async linkMember(code, senderJid, groupId) {
        const url = `${this.baseUrl}/api/bot/link`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json', 'x-bot-secret': this.secretKey },
                body: JSON.stringify({ code, senderJid, groupId }),
            });
            return await this.readJson(res, url);
        }
        catch (err) {
            console.error('[ApiClient] Error linking member:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }
    async connectGroup(code, groupId, groupName) {
        const url = `${this.baseUrl}/api/bot/group-connect`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json', 'x-bot-secret': this.secretKey },
                body: JSON.stringify({ code, groupId, groupName }),
            });
            return await this.readJson(res, url);
        }
        catch (err) {
            console.error('[ApiClient] Error connecting group:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }
    async getConnectedGroups() {
        const url = `${this.baseUrl}/api/bot/groups`;
        try {
            const res = await fetch(url, { redirect: 'manual', headers: { 'x-bot-secret': this.secretKey } });
            return await this.readJson(res, url);
        }
        catch (err) {
            console.error('[ApiClient] Error loading connected groups:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }
    async getMember(voterJid, groupId) {
        const params = new URLSearchParams({ voterJid, groupId });
        const url = `${this.baseUrl}/api/bot/member?${params}`;
        try {
            const res = await fetch(url, {
                redirect: 'manual',
                headers: { 'x-bot-secret': this.secretKey },
            });
            return await this.readJson(res, url);
        }
        catch (err) {
            console.error('[ApiClient] Error looking up member:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
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
                redirect: 'manual',
                headers: {
                    'x-bot-secret': this.secretKey,
                },
            });
            return await this.readJson(res, url);
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
