"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Unable to log in' }))
      setError(payload.error ?? 'Unable to log in')
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/8 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            মেসফ্লো (MessFlow)
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">আপনার মেসে লগইন করুন</h1>
          <p className="mt-2 text-sm text-slate-300">স্বাগতম! আপনার মেসের অ্যাকাউন্ট প্রস্তুত আছে।</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">ইমেইল অ্যাড্রেস (Email)</span>
            <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="manager@mess.com" required />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">পাসওয়ার্ড (Password)</span>
            <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">লগইন করুন</button>
          <a href="/signup" className="block text-center text-sm text-emerald-200 hover:text-white">নতুন অ্যাকাউন্ট খুলবেন? মেস তৈরি করুন</a>
        </form>
      </section>
    </main>
  )
}
