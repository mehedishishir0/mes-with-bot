"use client"

import { useEffect, useState } from 'react'

export default function MessSettingsPage() {
  const [messName, setMessName] = useState('')
  const [managerName, setManagerName] = useState('')
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
