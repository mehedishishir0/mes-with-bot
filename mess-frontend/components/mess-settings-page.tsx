"use client"

import { useEffect, useState } from 'react'

export default function MessSettingsPage() {
  const [messName, setMessName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [whatsappGroupId, setWhatsappGroupId] = useState('')
  const [whatsappGroupName, setWhatsappGroupName] = useState('')
  const [connectCode, setConnectCode] = useState('')
  const [connectExpiresAt, setConnectExpiresAt] = useState('')
  const [connectBusy, setConnectBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadSettings() {
      const response = await fetch('/api/mess/settings')
      if (!response.ok) {
        return
      }

      const payload = await response.json()
      setMessName(payload.mess.messName)
      setManagerName(payload.mess.managerName)
      setWhatsappGroupId(payload.mess.whatsappGroupId ?? '')
      setWhatsappGroupName(payload.mess.whatsappGroupName ?? '')
    }

    void loadSettings()
  }, [])

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const response = await fetch('/api/mess/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messName, managerName }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Unable to save mess settings' }))
      setError(payload.error ?? 'Unable to save mess settings')
      return
    }

    setSuccess('Mess profile updated')
  }

  async function createConnectCode() {
    setConnectBusy(true)
    setError('')
    try {
      const response = await fetch('/api/mess/whatsapp-connect-code', { method: 'POST' })
      const payload = await response.json().catch(() => ({ error: 'কোড তৈরি করা যায়নি।' }))
      if (!response.ok) throw new Error(payload.error ?? 'কোড তৈরি করা যায়নি।')
      setConnectCode(payload.code)
      setConnectExpiresAt(payload.expiresAt)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'কোড তৈরি করা যায়নি।')
    } finally {
      setConnectBusy(false)
    }
  }

  async function disconnectGroup() {
    if (!window.confirm('এই WhatsApp গ্রুপের automatic poll বন্ধ করতে চান?')) return
    setConnectBusy(true)
    setError('')
    try {
      const response = await fetch('/api/mess/whatsapp-connect-code', { method: 'DELETE' })
      const payload = await response.json().catch(() => ({ error: 'গ্রুপ বিচ্ছিন্ন করা যায়নি।' }))
      if (!response.ok) throw new Error(payload.error ?? 'গ্রুপ বিচ্ছিন্ন করা যায়নি।')
      setWhatsappGroupId('')
      setWhatsappGroupName('')
      setConnectCode('')
      setSuccess('WhatsApp গ্রুপ বিচ্ছিন্ন করা হয়েছে')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'গ্রুপ বিচ্ছিন্ন করা যায়নি।')
    } finally {
      setConnectBusy(false)
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('New password and confirmation must match')
      return
    }

    const response = await fetch('/api/mess/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Unable to update password' }))
      setError(payload.error ?? 'Unable to update password')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Password changed successfully')
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">মেসফ্লো (MessFlow)</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">অ্যাকাউন্ট ও মেস সেটানিংস</h1>
          </div>
          <a href="/dashboard" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">ড্যাশবোর্ডে ফিরে যান</a>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        {success && <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">মেস প্রোফাইল</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">প্রোফাইল তথ্য</h2>
            </div>
            <form className="space-y-4" onSubmit={saveProfile}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">মেসের নাম</span>
                <input className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" value={messName} onChange={(event) => setMessName(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">ম্যানেজারের নাম</span>
                <input className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" value={managerName} onChange={(event) => setManagerName(event.target.value)} required />
              </label>
              <button className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">প্রোফাইল সেইভ করুন</button>
            </form>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">WhatsApp Bot</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">গ্রুপ সংযোগ</h2>
            </div>

            {whatsappGroupId ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">✅ WhatsApp গ্রুপ সংযুক্ত</p>
                  <p className="mt-1 text-muted-foreground">{whatsappGroupName || whatsappGroupId}</p>
                </div>
                <button type="button" onClick={disconnectGroup} disabled={connectBusy} className="rounded-xl border border-rose-500/40 px-5 py-3 font-bold text-rose-600 hover:bg-rose-500/10 disabled:opacity-60">
                  গ্রুপ বিচ্ছিন্ন করুন
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>প্রথমে আপনার WhatsApp group-এ MessFlow bot number-টি add করুন। তারপর নিচের code group-এ পাঠান।</p>
                <button type="button" onClick={createConnectCode} disabled={connectBusy} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {connectBusy ? 'তৈরি হচ্ছে…' : 'Connect code তৈরি করুন'}
                </button>
                {connectCode && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-foreground">
                    <p className="text-sm font-semibold">গ্রুপে এই message পাঠান:</p>
                    <code className="mt-2 block select-all rounded-lg bg-background px-3 py-2 font-bold">!connect {connectCode}</code>
                    <p className="mt-2 text-xs text-muted-foreground">Codeটি {new Date(connectExpiresAt).toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' })} পর্যন্ত কার্যকর থাকবে।</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">সিকিউরিটি</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">পাসওয়ার্ড পরিবর্তন</h2>
            </div>
            <form className="space-y-4" onSubmit={savePassword}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">বর্তমান পাসওয়ার্ড</span>
                <input className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">নতুন পাসওয়ার্ড</span>
                <input className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">নতুন পাসওয়ার্ড নিশ্চিত করুন</span>
                <input className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </label>
              <button className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90">পাসওয়ার্ড আপডেট করুন</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
