"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.getDhakaDate = getDhakaDate;
exports.getDhakaHourMinute = getDhakaHourMinute;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
if (!process.env.BOT_SECRET_KEY)
    throw new Error('BOT_SECRET_KEY is required');
exports.CONFIG = {
    WEBSITE_API_URL: (process.env.WEBSITE_API_URL || 'http://localhost:3000').replace(/\/$/, ''),
    BOT_SECRET_KEY: process.env.BOT_SECRET_KEY || '',
    TIMEZONE: process.env.TIMEZONE || 'Asia/Dhaka',
    AUTH_DIR: path_1.default.resolve(process.cwd(), 'auth_info'),
};
function getDhakaDate() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: exports.CONFIG.TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const value = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
}
function getDhakaHourMinute() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: exports.CONFIG.TIMEZONE,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return { hour, minute };
}
