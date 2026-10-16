"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    messName: '',
    managerName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: 'Unable to create mess account' }))
      setError(payload.error ?? 'Unable to create mess account')
      return
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/8 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            মেসফ্লো (MessFlow)
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">নতুন মেস অ্যাকাউন্ট তৈরি করুন</h1>
          <p className="mt-2 text-sm text-slate-300">আপনার মেসের সকল মিল ও হিসাব সহজে পরিচালনা করতে আজই শুরু করুন।</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">মেসের নাম (Mess Name)</span>
            <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="text" value={form.messName} onChange={(event) => setForm({ ...form, messName: event.target.value })} placeholder="যেমন: নিরিবিলি মেস / ফ্লাট ৪বি" required />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">ম্যানেজারের নাম (Manager Name)</span>
            <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="text" value={form.managerName} onChange={(event) => setForm({ ...form, managerName: event.target.value })} placeholder="যেমন: শিমুল / শাকিল" required />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">ইমেইল অ্যাড্রেস (Email)</span>
            <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="manager@mess.com" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              <span className="mb-2 block">পাসওয়ার্ড (Password)</span>
              <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" required />
            </label>
            <label className="block text-sm font-medium">
              <span className="mb-2 block">পাসওয়ার্ড নিশ্চিত করুন</span>
              <input className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-400" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="••••••••" required />
            </label>
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">মেস অ্যাকাউন্ট তৈরি করুন</button>
          <a href="/login" className="block text-center text-sm text-emerald-200 hover:text-white">আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন</a>
        </form>
      </section>
    </main>
  )
}
