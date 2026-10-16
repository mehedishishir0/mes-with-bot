import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys'
import fs from 'fs'
import http from 'http'
import path from 'path'
import pino from 'pino'
import QRCode from 'qrcode'
import qrcodeTerminal from 'qrcode-terminal'
import NodeCache from 'node-cache'
import { apiClient } from './apiClient.js'
import { CONFIG, getDhakaDate, getDhakaHourMinute } from './config.js'
import { pollManager } from './pollManager.js'
import { setupScheduler } from './scheduler.js'

// Handle transient Signal protocol / cipher negotiation warnings without terminating process
process.on('uncaughtException', (err) => {
  const msg = (err as any)?.message || String(err)
  if (msg.includes('No sessions') || msg.includes('SessionError') || msg.includes('Bad MAC')) {
    console.warn('[WhatsApp Signal Warning - Handled]:', msg)
    return
  }
  console.error('[Uncaught Exception]:', err)
})

process.on('unhandledRejection', (reason) => {
  const msg = (reason as any)?.message || String(reason)
  if (msg.includes('No sessions') || msg.includes('SessionError') || msg.includes('Bad MAC')) {
    console.warn('[WhatsApp Signal Rejection - Handled]:', msg)
    return
  }
  console.error('[Unhandled Rejection]:', reason)
})

let activeGroupJid: string | null = CONFIG.WHATSAPP_GROUP_ID || null
let latestQrDataUrl: string | null = null
let currentPairingCode: string | null = null
let isConnected = false
let botUserJid = ''
let currentSocket: WASocket | null = null

export const messageStore = new Map<string, proto.IMessage>()
const msgRetryCounterCache = new NodeCache()

// In-memory store for automatic message tracking across chats and retries
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) as any })
const STORE_FILE = path.resolve(process.cwd(), 'baileys_store.json')
try {
  if (fs.existsSync(STORE_FILE)) {
    store.readFromFile(STORE_FILE)
  }
} catch (err) {
  // ignore
}
setInterval(() => {
  try {
    store.writeToFile(STORE_FILE)
  } catch {}
}, 10_000)

// Preload today's polls into messageStore so retry requests can always decrypt them
function preloadPollMessages() {
  try {
    const pollFile = path.resolve(process.cwd(), 'active_polls.json')
    if (fs.existsSync(pollFile)) {
      const data = JSON.parse(fs.readFileSync(pollFile, 'utf-8'))
      if (Array.isArray(data)) {
        for (const p of data) {
          if (p.id && p.message) {
            messageStore.set(p.id, p.message)
            if (p.key?.remoteJid) {
              messageStore.set(`${p.key.remoteJid}:${p.id}`, p.message)
            }
          }
        }
      }
    }
  } catch {}
}
preloadPollMessages()


// Start a lightweight local web server to display the QR code cleanly in the browser!
const WEB_PORT = 4000
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  if (isConnected) {
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp Bot Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; }
            .badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; background: #065f46; color: #34d399; font-weight: 700; font-size: 0.875rem; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">● লাইভ কানেক্টেড</div>
            <h2 style="margin: 0 0 0.5rem 0;">✅ WhatsApp কানেক্ট সফল!</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.5;">বটটি এখন আপনার মেস গ্রুপের সাথে সক্রিয়ভাবে যুক্ত আছে।</p>
            <p style="color: #64748b; font-size: 0.8rem; margin-top: 1.5rem;">বট আইডি: ${botUserJid || 'Active'}</p>
          </div>
        </body>
      </html>
    `)
    return
  }

  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp Bot Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="8">
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .qr-box { background: white; padding: 1rem; border-radius: 1rem; display: inline-block; margin: 1rem 0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
          .pairing { background: #0f172a; padding: 1rem; border-radius: 0.75rem; border: 1px dashed #3b82f6; font-size: 1.5rem; font-weight: 800; letter-spacing: 2px; color: #60a5fa; margin: 1rem 0; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 0.5rem 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin: 0 0 0.5rem 0;">📱 WhatsApp বট কানেক্ট করুন</h2>
          <p>আপনার ফোন থেকে WhatsApp খুলে <b>Linked Devices > Link a Device</b> এ গিয়ে নিচের কোডটি স্ক্যান করুন:</p>
          ${
            latestQrDataUrl
              ? `<div class="qr-box"><img src="${latestQrDataUrl}" width="260" height="260" alt="WhatsApp QR Code" /></div>`
              : `<p style="padding: 2rem 0; color: #f59e0b;">⏳ QR কোড তৈরি হচ্ছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন...</p>`
          }
          ${
            currentPairingCode
              ? `<p style="margin-top: 1rem; font-weight: 600;">অথবা ফোন নম্বর পেয়ারিং কোড:</p><div class="pairing">${currentPairingCode}</div>`
              : ''
          }
          <p style="font-size: 0.75rem; color: #64748b;">(পেজটি নিজে থেকেই অটো-রিফ্রেশ হবে)</p>
        </div>
      </body>
    </html>
  `)
})

server.listen(WEB_PORT, () => {
  console.log(`\n🌐 [QR Web View] ব্রাউজারে স্পষ্ট QR কোড দেখতে ভিজিট করুন: http://localhost:${WEB_PORT}\n`)
})

async function startBot() {
  console.log('====================================================')
  console.log('🤖 Starting Mess WhatsApp Meal Management Bot...')
  console.log(`🌐 Website URL: ${CONFIG.WEBSITE_API_URL}`)
  console.log(`⏰ Timezone: ${CONFIG.TIMEZONE}`)
  console.log('====================================================')

  const logger = pino({ level: 'silent' })
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`[WhatsApp] Using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock: WASocket = makeWASocket({
    version,
    logger: logger as any,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    msgRetryCounterCache,
    syncFullHistory: false,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      const id = key.id
      const fullId = `${key.remoteJid}:${key.id}`
      let msg = (id ? messageStore.get(id) : undefined) || messageStore.get(fullId)
      if (msg) return msg

      if (key.remoteJid && key.id && store) {
        const loaded = await store.loadMessage(key.remoteJid, key.id)
        if (loaded?.message) return loaded.message
      }
      return undefined
    },
  })

  // Bind message store to handle history & retries
  store.bind(sock.ev)

  // Intercept sock.sendMessage to automatically save all outgoing messages into messageStore
  const rawSendMessage = sock.sendMessage.bind(sock)
  sock.sendMessage = (async (jid: any, content: any, options: any) => {
    const sent = await rawSendMessage(jid, content, options)
    if (sent && sent.message && sent.key?.id) {
      const remote = sent.key.remoteJid || jid
      messageStore.set(sent.key.id, sent.message)
      messageStore.set(`${remote}:${sent.key.id}`, sent.message)
    }
    return sent
  }) as any

  currentSocket = sock
  sock.ev.on('creds.update', saveCreds)

  const isAlreadyLoggedIn = Boolean(sock.authState.creds.registered || sock.authState.creds.me?.id)
  if (isAlreadyLoggedIn) {
    console.log(`[WhatsApp] Existing session found for ${sock.authState.creds.me?.name || 'User'} (${sock.authState.creds.me?.id}). Resuming connection...`)
  }

  // Pairing code option if specified in .env and NOT already logged in
  const pairingNumber = process.env.PAIRING_PHONE_NUMBER?.trim()
  if (pairingNumber && !isAlreadyLoggedIn) {
    let cleanNumber = pairingNumber.replace(/\D/g, '')
    if (cleanNumber.startsWith('01') && cleanNumber.length === 11) {
      cleanNumber = '88' + cleanNumber
    } else if (cleanNumber.startsWith('1') && cleanNumber.length === 10) {
      cleanNumber = '880' + cleanNumber
    }

    console.log(`[WhatsApp] Pairing with number: +${cleanNumber}`)

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(cleanNumber)
        currentPairingCode = code?.match(/.{1,4}/g)?.join('-') || code
        console.log(`\n====================================================`)
        console.log(`📱 মোবাইল নাম্বার: +${cleanNumber}`)
        console.log(`🔗 [PAIRING CODE]: ${currentPairingCode}`)
        console.log(`👉 আপনার ফোনে WhatsApp > Linked Devices > "Link with phone number instead" এ গিয়ে এই কোডটি লিখুন!`)
        console.log(`====================================================\n`)
      } catch (err) {
        console.error('[WhatsApp] Pairing code note:', (err as any)?.message || err)
      }
    }, 2500)
  }

  // Connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr && !isAlreadyLoggedIn) {
      try {
        latestQrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 300 })
      } catch (err) {
        // ignore
      }

      console.log('\n📲 [QR CODE AVAILABLE]')
      console.log(`👉 আপনার ব্রাউজারে খুলুন: http://localhost:${WEB_PORT} (এখানে স্পষ্ট পরিষ্কার QR কোড দেখতে পাবেন)`)
      console.log('অথবা নিচের টার্মিনাল কোডটি স্ক্যান করুন:\n')
      qrcodeTerminal.generate(qr, { small: true })
    }

    if (connection === 'close') {
      isConnected = false
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      console.log(`[WhatsApp] Connection closed (code: ${statusCode || 'unknown'}).`)

      if (isLoggedOut) {
        console.log('[WhatsApp] ⚠️ Session was logged out from WhatsApp. Resetting session for fresh QR login...')
        latestQrDataUrl = null
        currentPairingCode = null
        try {
          if (fs.existsSync(CONFIG.AUTH_DIR)) {
            fs.rmSync(CONFIG.AUTH_DIR, { recursive: true, force: true })
          }
        } catch {}
      }

      console.log('[WhatsApp] Reconnecting in 3 seconds...')
      setTimeout(startBot, 3000)
    } else if (connection === 'open') {
      isConnected = true
      botUserJid = sock.user?.id || ''
      latestQrDataUrl = null
      currentPairingCode = null

      console.log('\n====================================================')
      console.log('🎉 [WhatsApp] SUCCESSFULLY CONNECTED!')
      console.log(`📱 Bot JID: ${botUserJid}`)
      console.log('====================================================')

      // Discover and display user groups
      try {
        const groups = await sock.groupFetchAllParticipating()
        const groupList = Object.values(groups)

        console.log(`\n📋 Found ${groupList.length} group(s):`)
        groupList.forEach((g) => {
          console.log(`  • "${g.subject}" (ID: ${g.id})`)
        })

        // Determine target group
        if (CONFIG.WHATSAPP_GROUP_ID) {
          activeGroupJid = CONFIG.WHATSAPP_GROUP_ID
          console.log(`\n🎯 Using configured WHATSAPP_GROUP_ID: ${activeGroupJid}`)
        } else if (CONFIG.WHATSAPP_GROUP_NAME) {
          const match = groupList.find(
            (g) => g.subject.toLowerCase() === CONFIG.WHATSAPP_GROUP_NAME.toLowerCase()
          )
          if (match) {
            activeGroupJid = match.id
            console.log(`\n🎯 Matched group by name "${CONFIG.WHATSAPP_GROUP_NAME}": ${activeGroupJid}`)
          } else {
            console.warn(`\n⚠️ Group named "${CONFIG.WHATSAPP_GROUP_NAME}" not found.`)
          }
        }

        if (!activeGroupJid && groupList.length > 0) {
          activeGroupJid = groupList[0].id
          console.log(`\n👉 Automatically targeting first group: "${groupList[0].subject}" (${activeGroupJid})`)
        }

        // Start background scheduler
        setupScheduler(sock, () => activeGroupJid)
      } catch (err) {
        console.error('[WhatsApp] Error fetching groups:', err)
      }
    }
  })

  // Listen for messages (commands and poll updates)
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      const remoteJid = msg.key.remoteJid
      if (!remoteJid) continue

      // Save to store for cipher/retry
      if (msg.message && msg.key.id) {
        messageStore.set(msg.key.id, msg.message)
        messageStore.set(`${remoteJid}:${msg.key.id}`, msg.message)
      }

      // 1. Handle Poll Vote Updates
      const pollUpdate = msg.message?.pollUpdateMessage
      if (pollUpdate) {
        const sender = msg.key.participant || msg.participant || remoteJid
        try {
          await pollManager.handlePollUpdate(sock, pollUpdate, sender)
        } catch (err) {
          console.error('[Poll Error]:', err)
        }
        continue
      }

      // 2. Handle Text Commands (for testing and manual control)
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''

      if (!text.startsWith('!')) continue

      console.log(`[WhatsApp Message Received in ${remoteJid}]: "${text}"`)

      const cmd = text.trim().toLowerCase().replace(/\s+/g, '-')

      try {
        if (cmd === '!status' || cmd === '!ping') {
          const { hour, minute } = getDhakaHourMinute()
          const today = getDhakaDate()
          await sock.sendMessage(remoteJid, {
            text: `🤖 *Mess Bot Status:*\n✅ Status: Active & Connected\n📅 Date: ${today}\n⏰ Current Dhaka Time: ${hour}:${minute < 10 ? '0' + minute : minute}\n👥 Group: ${remoteJid}`,
          })
          console.log(`[Bot] Replied to !status in ${remoteJid}`)
        } else if (
          cmd === '!poll-lunch' ||
          cmd === '!pool-lunch' ||
          cmd === '!lunch' ||
          cmd === '!polllunch' ||
          cmd === '!poollunch'
        ) {
          await sock.sendMessage(remoteJid, { text: '🚀 Sending test lunch poll...' })
          await pollManager.sendLunchPoll(sock, remoteJid)
          console.log(`[Bot] Sent lunch poll to ${remoteJid}`)
        } else if (
          cmd === '!poll-dinner' ||
          cmd === '!pool-dinner' ||
          cmd === '!dinner' ||
          cmd === '!polldinner' ||
          cmd === '!pooldinner'
        ) {
          await sock.sendMessage(remoteJid, { text: '🚀 Sending test dinner poll...' })
          await pollManager.sendDinnerPoll(sock, remoteJid)
          console.log(`[Bot] Sent dinner poll to ${remoteJid}`)
        } else if (cmd === '!lock-lunch' || cmd === '!locklunch') {
          await pollManager.lockLunchPoll(sock, remoteJid)
        } else if (cmd === '!lock-dinner' || cmd === '!lockdinner') {
          await pollManager.lockDinnerPoll(sock, remoteJid)
        } else if (cmd === '!summary' || cmd === '!meal' || cmd === '!meals') {
          const today = getDhakaDate()
          const res = await apiClient.getSummary(today, undefined, remoteJid)
          if (res.success && res.summary) {
            const list = res.members
              ?.filter((m) => m.total > 0)
              ?.map((m) => `• ${m.name}: লাঞ্চ ${m.lunch}, ডিনার ${m.dinner}`)
              ?.join('\n') || '(কোনো মিল এন্ট্রি পাওয়া যায়নি)'

            await sock.sendMessage(remoteJid, {
              text: `📊 *আজকের মিল সামারি (${today}):*\n🍛 মোট লাঞ্চ: ${res.summary.totalLunch} টি\n🌙 মোট ডিনার: ${res.summary.totalDinner} টি\n\n*সদস্যদের মিল:*\n${list}`,
            })
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ সামারি পাওয়া যায়নি: ${res.error}` })
          }
        } else if (cmd === '!help') {
          await sock.sendMessage(remoteJid, {
            text: `📋 *বট কমান্ড লিস্ট:*\n• \`!status\` - বটের অবস্থা দেখুন\n• \`!poll-lunch\` বা \`!lunch\` - দুপুরের পোল পাঠান\n• \`!poll-dinner\` বা \`!dinner\` - রাতের পোল পাঠান\n• \`!lock-lunch\` - দুপুরের পোল লক করুন\n• \`!lock-dinner\` - রাতের পোল লক করুন\n• \`!summary\` - আজকের মিলের সামারি দেখুন`,
          })
        }
      } catch (cmdErr) {
        console.error(`[Command Error for ${cmd}]:`, cmdErr)
      }
    }
  })
}

startBot().catch((err) => {
  console.error('[Bot Fatal Error]:', err)
})
