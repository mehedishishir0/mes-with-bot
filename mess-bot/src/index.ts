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
import readline from 'readline'
import QRCode from 'qrcode'
import qrcodeTerminal from 'qrcode-terminal'
import NodeCache from 'node-cache'
import { apiClient } from './apiClient.js'
import { CONFIG, getDhakaDate, getDhakaHourMinute } from './config.js'
import { pollManager, revivePollBuffer } from './pollManager.js'
import { pauseScheduler, setupScheduler } from './scheduler.js'

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

let connectedGroupIds = new Set<string>()
let latestQrDataUrl: string | null = null
let currentPairingCode: string | null = null
let isConnected = false
let botUserJid = ''
let currentSocket: WASocket | null = null
let connectionGeneration = 0
let reconnectTimer: NodeJS.Timeout | null = null
let resetInProgress = false

async function refreshConnectedGroups(): Promise<string[]> {
  const result = await apiClient.getConnectedGroups()
  if (!result.success || !result.groups) {
    console.warn(`[Bot] Could not refresh connected mess groups: ${result.error || 'unknown error'}`)
    return [...connectedGroupIds]
  }
  connectedGroupIds = new Set(result.groups.map((group) => group.id))
  return [...connectedGroupIds]
}

// Type "reset" in the running bot terminal to request a new WhatsApp QR code.
const terminal = readline.createInterface({ input: process.stdin, output: process.stdout })
console.log('⌨️  WhatsApp নতুন করে লিংক করতে এই টার্মিনালে reset লিখে Enter চাপুন।')
terminal.on('line', (line) => {
  if (line.trim().toLowerCase() !== 'reset') return
  void resetWhatsAppSession()
})

async function resetWhatsAppSession() {
  if (resetInProgress) return
  resetInProgress = true
  connectionGeneration++ // Ignore events and credential writes from the old socket.
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  pauseScheduler()
  const oldSocket = currentSocket
  currentSocket = null
  isConnected = false
  botUserJid = ''
  latestQrDataUrl = null
  currentPairingCode = null

  try {
    try {
      oldSocket?.end(new Error('Terminal session reset'))
    } catch (err) {
      console.warn('[Reset] Could not close old socket cleanly:', err)
    }
    fs.rmSync(CONFIG.AUTH_DIR, { recursive: true, force: true })
    console.log('\n🔄 WhatsApp session reset হয়েছে। নতুন QR তৈরি হচ্ছে...')
    await startBot()
    console.log(`📲 QR দেখতে খুলুন: http://localhost:${WEB_PORT}\n`)
  } catch (err) {
    console.error('[Reset Error]:', err)
    console.error('আবার reset লিখে Enter চাপুন।')
  } finally {
    resetInProgress = false
  }
}

export const messageStore = new Map<string, proto.IMessage>()
const msgRetryCounterCache = new NodeCache()

// In-memory store for automatic message tracking across chats and retries (RAM only, never writes to disk)
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) as any })

// Clean up any legacy disk store file to free storage and ensure privacy
const legacyStoreFile = path.resolve(process.cwd(), 'baileys_store.json')
try {
  if (fs.existsSync(legacyStoreFile)) {
    fs.unlinkSync(legacyStoreFile)
  }
} catch {}

// Preload today's polls into messageStore so retry requests can always decrypt them
function preloadPollMessages() {
  try {
    const pollFile = path.resolve(process.cwd(), 'active_polls.json')
    if (fs.existsSync(pollFile)) {
      const data = JSON.parse(fs.readFileSync(pollFile, 'utf-8'), revivePollBuffer)
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

server.listen(WEB_PORT, '127.0.0.1', () => {
  console.log(`\n🌐 [QR Web View] ব্রাউজারে স্পষ্ট QR কোড দেখতে ভিজিট করুন: http://localhost:${WEB_PORT}\n`)
})

async function startBot() {
  const generation = ++connectionGeneration
  console.log('====================================================')
  console.log('🤖 Starting Mess WhatsApp Meal Management Bot...')
  console.log(`🌐 Website URL: ${CONFIG.WEBSITE_API_URL}`)
  console.log(`⏰ Timezone: ${CONFIG.TIMEZONE}`)
  console.log('====================================================')

  const logger = pino({ level: 'silent' })
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  if (generation !== connectionGeneration) return
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
    generateHighQualityLinkPreview: false, // Reduces IQ queries that cause 406 errors
    retryRequestDelayMs: 2000,             // Wait 2s between retries to avoid rate limiting
    maxMsgRetryCount: 5,                   // Allow up to 5 retries on send failures
    // Wrap interactive messages to bypass Signal session assertion on some WA server versions
    patchMessageBeforeSending: (msg) => {
      const requiresPatch = !!(
        (msg as any).buttonsMessage ||
        (msg as any).templateMessage ||
        (msg as any).listMessage
      )
      if (requiresPatch) {
        msg = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {},
              },
              ...msg,
            },
          },
        } as any
      }
      return msg
    },
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
  sock.ev.on('creds.update', () => {
    if (generation === connectionGeneration) void saveCreds()
  })

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
      if (generation !== connectionGeneration) return
      try {
        const code = await sock.requestPairingCode(cleanNumber)
        if (generation !== connectionGeneration) return
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
    if (generation !== connectionGeneration) return
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
      pauseScheduler()
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
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        if (generation === connectionGeneration) {
          void startBot().catch((err) => console.error('[Reconnect Error]:', err))
        }
      }, 3000)
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

        const registeredGroups = await refreshConnectedGroups()
        console.log(`\n🎯 ${registeredGroups.length} connected mess group(s) loaded from website.`)

        // Fetch participants for each registered group and allow Signal sessions to settle.
        for (const groupJid of registeredGroups) {
          try {
            const groupMeta = await sock.groupMetadata(groupJid)
            for (const participant of groupMeta.participants) {
              try {
                await sock.presenceSubscribe(participant.id)
              } catch {
                // Presence subscription is a best-effort warmup only.
              }
            }
          } catch (warmupErr) {
            console.warn(`[Warmup] Could not fetch group metadata for ${groupJid}:`, warmupErr)
          }
        }
        await new Promise((r) => setTimeout(r, 3000))
        console.log('✅ Connection warmup complete. New groups can be connected with !connect CODE.')

        // Start background scheduler
        if (generation !== connectionGeneration) return
        setupScheduler(sock, refreshConnectedGroups)
      } catch (err) {
        console.error('[WhatsApp] Error fetching groups:', err)
      }
    }
  })

  // Baileys emits decrypted poll selections here, after processing messages.upsert.
  sock.ev.on('messages.update', async (updates) => {
    if (generation !== connectionGeneration) return
    for (const { key, update } of updates) {
      if (!key.id || !update.pollUpdates?.length) continue
      for (const pollUpdate of update.pollUpdates) {
        await pollManager.handlePollUpdate(sock, key.id, pollUpdate)
      }
    }
  })

  // Listen for incoming text commands and save messages for poll decryption.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (generation !== connectionGeneration) return
    // 'notify' = new incoming messages; 'append' = history sync — we only care about new messages
    console.log(`[Event] messages.upsert type="${type}" count=${messages.length}`)

    for (const msg of messages) {
      const remoteJid = msg.key.remoteJid
      if (!remoteJid) continue

      // Debug: log every received message (helps diagnose receive issues)
      const msgType = Object.keys(msg.message || {}).join(', ') || 'null/empty'
      const fromMe = msg.key.fromMe ? '(fromMe)' : ''
      console.log(`[MSG] jid=${remoteJid} type=${msgType} ${fromMe}`)

      // Save to store for cipher/retry
      if (msg.message && msg.key.id) {
        messageStore.set(msg.key.id, msg.message)
        messageStore.set(`${remoteJid}:${msg.key.id}`, msg.message)
      }

      // Skip stub/empty messages (no real content)
      if (!msg.message) continue

      // Handle text commands (for testing and manual control)
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''

      if (!text.startsWith('!') || msg.key.fromMe || type !== 'notify') continue

      const isLinkCommand = /^!\s*link(?:\s+|$)/i.test(text.trim())
      const isConnectCommand = /^!\s*connect(?:\s+|$)/i.test(text.trim())
      console.log(`[CMD] Received in ${remoteJid}: "${isLinkCommand || isConnectCommand ? text.replace(/\s+[a-f0-9]{16}\s*$/i, ' [hidden]') : text}"`)

      const cmd = text.trim().toLowerCase().replace(/\s+/g, '-')

      // Helper: retry sendMessage up to 3 times on transient 'not-acceptable' errors
      const safeSend = async (jid: string, content: any, retries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await sock.sendMessage(jid, content)
          } catch (err: any) {
            const isRetryable =
              err?.message === 'not-acceptable' ||
              err?.data === 406 ||
              err?.output?.statusCode === 500
            if (isRetryable && attempt < retries) {
              console.warn(`[Bot] sendMessage attempt ${attempt} failed (${err.message}), retrying in 2s...`)
              await new Promise((r) => setTimeout(r, 2000))
            } else {
              throw err
            }
          }
        }
      }

      try {
        if (isConnectCommand) {
          const code = text.trim().match(/^!\s*connect\s+([a-f0-9]{16})\s*$/i)?.[1]
          if (!code) {
            await safeSend(remoteJid, { text: '❌ ওয়েবসাইটের Settings থেকে পাওয়া ১৬ অক্ষরের code দিয়ে লিখুন: !connect CODE' })
            continue
          }
          let groupName: string | undefined
          try {
            groupName = (await sock.groupMetadata(remoteJid)).subject
          } catch {
            // The group ID is still enough to complete a connection.
          }
          const result = await apiClient.connectGroup(code, remoteJid, groupName)
          if (result.success) connectedGroupIds.add(remoteJid)
          await safeSend(remoteJid, {
            text: result.success
              ? `✅ *${result.messName}* মেসের সঙ্গে এই WhatsApp group যুক্ত হয়েছে। এখন member link ও automatic poll চালু থাকবে।`
              : `❌ ${result.error || 'গ্রুপ যুক্ত করা যায়নি।'}`,
          })
          continue
        }

        const connected = connectedGroupIds.has(remoteJid) || (await refreshConnectedGroups()).includes(remoteJid)
        if (!connected) {
          await safeSend(remoteJid, { text: '❌ এই group এখনো কোনো mess-এর সঙ্গে যুক্ত নয়। Website Settings থেকে connect code নিয়ে !connect CODE পাঠান।' })
          continue
        }

        if (isLinkCommand) {
          const senderJid = msg.key.participant
          const code = text.trim().match(/^!\s*link\s+([a-f0-9]{16})\s*$/i)?.[1]
          if (!code) {
            await safeSend(remoteJid, { text: '❌ CODE শব্দটি উদাহরণ। ওয়েবসাইটের মেম্বারবৃন্দ পেজে “লিংক কোড তৈরি করুন” চাপুন, তারপর সেখানে দেখানো ১৬ অক্ষরের আসল কোড কপি করে !link-এর পরে লিখুন।' })
            continue
          }
          if (!senderJid?.endsWith('@lid')) {
            await safeSend(remoteJid, { text: '❌ এই WhatsApp মেসেজ থেকে পরিচয় শনাক্ত করা যায়নি। গ্রুপে নিজের অ্যাকাউন্ট থেকে আবার চেষ্টা করুন।' })
            continue
          }
          const result = await apiClient.linkMember(code, senderJid, remoteJid)
          await safeSend(remoteJid, {
            text: result.success
              ? `✅ ${result.memberName} এর WhatsApp অ্যাকাউন্ট যুক্ত হয়েছে। এখন পোল ভোট দিলে ওয়েবসাইটে আপডেট হবে।`
              : `❌ ${result.error || 'অ্যাকাউন্ট যুক্ত করা যায়নি।'}`,
          })
        } else if (cmd === '!status' || cmd === '!ping') {
          const { hour, minute } = getDhakaHourMinute()
          const today = getDhakaDate()
          await safeSend(remoteJid, {
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
          await safeSend(remoteJid, { text: '🚀 Sending test lunch poll...' })
          await pollManager.sendLunchPoll(sock, remoteJid)
          console.log(`[Bot] Sent lunch poll to ${remoteJid}`)
        } else if (
          cmd === '!poll-dinner' ||
          cmd === '!pool-dinner' ||
          cmd === '!dinner' ||
          cmd === '!polldinner' ||
          cmd === '!pooldinner'
        ) {
          await safeSend(remoteJid, { text: '🚀 Sending test dinner poll...' })
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

            await safeSend(remoteJid, {
              text: `📊 *আজকের মিল সামারি (${today}):*\n🍛 মোট লাঞ্চ: ${res.summary.totalLunch} টি\n🌙 মোট ডিনার: ${res.summary.totalDinner} টি\n\n*সদস্যদের মিল:*\n${list}`,
            })
          } else {
            await safeSend(remoteJid, { text: `❌ সামারি পাওয়া যায়নি: ${res.error}` })
          }
        } else if (cmd === '!help') {
          await safeSend(remoteJid, {
            text: `📋 *বট কমান্ড লিস্ট:*\n• \`!connect CODE\` - Settings-এর code দিয়ে এই group যুক্ত করুন\n• \`!link CODE\` - ওয়েবসাইটের কোড দিয়ে অ্যাকাউন্ট যুক্ত করুন\n• \`!status\` - বটের অবস্থা দেখুন\n• \`!poll-lunch\` বা \`!lunch\` - দুপুরের পোল পাঠান\n• \`!poll-dinner\` বা \`!dinner\` - রাতের পোল পাঠান\n• \`!lock-lunch\` - দুপুরের পোল লক করুন\n• \`!lock-dinner\` - রাতের পোল লক করুন\n• \`!summary\` - আজকের মিলের সামারি দেখুন`,
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
