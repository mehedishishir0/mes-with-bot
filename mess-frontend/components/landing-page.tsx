import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TrendingDown,
  Users,
  Utensils,
  WalletCards,
} from "lucide-react";

export default function MessFlowLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background glow graphics */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-600/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-teal-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Floating Glassmorphic Navbar Header */}
        <header className="sticky top-4 z-50 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between rounded-3xl border border-white/15 bg-slate-900/80 px-5 py-3 shadow-2xl backdrop-blur-xl">
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 p-1 border border-emerald-500/40 shadow-lg shadow-emerald-500/20 transition group-hover:scale-105">
                <img
                  src="/messflow-logo.png"
                  alt="MessFlow Official Logo"
                  className="size-full object-contain rounded-xl"
                />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent flex items-center gap-2">
                  <span>মেসফ্লো (MessFlow)</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">PRO</span>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400/90">
                  ডিজিটাল মেস প্ল্যাটফর্ম
                </div>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-300">
              <a href="#features" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-emerald-300 transition">ফিচারসমূহ</a>
              <a href="#benefits" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-emerald-300 transition">সুবিধাসমূহ</a>
              <a href="#templates" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-emerald-300 transition">টেমপ্লেট প্রিভিউ</a>
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs font-bold text-white transition hover:bg-white/15 hover:border-white/40"
              >
                লগইন
              </a>
              <a
                href="/signup"
                className="rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 px-6 py-2 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-400/40 hover:scale-105"
              >
                নতুন মেস তৈরি করুন
              </a>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                <Sparkles size={14} />
                <span>স্মার্ট ডিজিটাল মেস রেজিস্টার</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl lg:text-6xl text-white">
                মেসের মিল, বাজার ও বাসা ভাড়ার{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  সম্পূর্ণ স্বচ্ছ হিসাব।
                </span>
              </h1>

              <p className="text-base text-slate-300 sm:text-lg leading-relaxed max-w-2xl">
                ম্যানুয়াল খাতা-কলমের হিসাবের দিন শেষ! মেসফ্লো দিয়ে মেসের সকল সদস্যের দৈনিক মিল সংখ্যা, বাজার খরচ, বাসা ভাড়া, ইউটিলিটি বিল এবং মাসিক সেটেলমেন্টের নিখুঁত সমাধান পান এক জায়গায়।
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:brightness-110 hover:scale-[1.02]"
                >
                  <span>বিনামূল্যে মেস তৈরি করুন</span>
                  <ArrowRight size={18} />
                </a>
                <a
                  href="/login"
                  className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  লগইন করুন
                </a>
              </div>

              {/* Quick stats badges */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 max-w-xl">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">১০‌০%</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">ভুলমুক্ত হিসাব</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-300">১-ক্লিক</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">এক্সেল/পিডিএফ রিপোর্ট</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">২৪/৭</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">ক্লাউড ডাটাবেজ</p>
                </div>
              </div>
            </div>

            {/* Hero App Display Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-3 shadow-2xl backdrop-blur-xl group">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  <img
                    src="/hero-dashboard.png"
                    alt="MessFlow Dashboard Interface"
                    className="w-full h-auto object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-5 -left-5 rounded-2xl border border-emerald-500/40 bg-slate-950/90 p-4 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">স্মার্ট মিল রেট</p>
                    <p className="text-sm font-extrabold text-emerald-400">৳ ৪২.৫০ / মিল</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="mx-auto max-w-7xl px-6 py-20 border-t border-white/10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 mb-4">
              সুবিধাসমূহ (Benefits)
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              কেন আপনার মেসে মেসফ্লো ব্যবহার করবেন?
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              মেসের ম্যানেজার ও মেম্বারদের জীবনের ঝামেলা কমিয়ে ডিজিটাল ও স্বচ্ছ হিসাব নিশ্চিত করতে তৈরি বিশেষ ফিচারসমূহ:
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-5">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">স্বচ্ছ ও ভুলমুক্ত হিসাব</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ম্যানুয়াল হিসাবের ভুলভ্রান্তি ও গণ্ডগোল পুরোপুরি বন্ধ। মিল রেট, বাজার জমা, বাসা ভাড়া ও ইউটিলিটি সমন্বয়ে প্রতি মাসের নিখুঁত হিসাব।
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 mb-5">
                <TrendingDown size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">স্মার্ট বাজেট ও মিল রেট অপ্টিমাইজার</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                টার্গেট মিল রেট সেট করে বাজেট নিয়ন্ত্রণ করুন অথবা মিল ভলিউম বাড়িয়ে কীভাবে মিল রেট কমাবেন তার দ্বিমুখী অটোমেটিক সাজেশন পান।
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 mb-5">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">পিডিএফ ও এক্সেল রিপোর্ট ডাউনলোড</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                এক ক্লিকে মেসের পুরো মাসের সেটেলমেন্ট এক্সেল ফাইল আকারে ডাউনলোড করুন অথবা প্রিন্ট ও পিডিএফ কপি সংরক্ষণ করুন।
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-5">
                <Home size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">বাসা ভাড়া ও ফিক্সড ইউটিলিটি চার্জ</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                মেসের ফ্ল্যাট ভাড়া, বিদ্যুৎ বিল, গ্যাস বিল, ইন্টারনেট ও খালা বিলসহ সকল শেয়ার্ড খরচ একসাথে হিসাব করুন।
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 mb-5">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">মোবাইল ও কম্পিউটারে সহজ এন্ট্রি</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                যেকোনো স্মার্টফোন বা কম্পিউটার থেকে খুব সহজে দৈনিক মিল সংখ্যা ও বাজারের এন্ট্রি দিন যেকোনো সময়ে।
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-emerald-500/40 hover:bg-white/8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">সুরক্ষিত ক্লাউড ডাটাবেজ</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                মাসের তথ্য হারানোর বা খাতা নষ্ট হওয়ার কোনো ভয় নেই। MongoDB ক্লাউডে এনক্রিপ্টেড ও সেইফ ডাটা স্টোরেজ।
              </p>
            </div>
          </div>
        </section>

        {/* Feature Templates & Live Previews */}
        <section id="templates" className="mx-auto max-w-7xl px-6 py-20 border-t border-white/10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-teal-300 mb-4">
              ট্রেস ও টেমপ্লেট ডেমো (Feature Previews)
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-white">
              মেসফ্লোর পাওয়ারফুল ফিচার টেমপ্লেটসমূহ
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              একনজরে দেখে নিন মেসফ্লোর আধুনিক ও সুসংগঠিত ইন্টারফেস টেমপ্লেটসমূহ:
            </p>
          </div>

          <div className="space-y-16">
            {/* Feature 1 */}
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                  <Utensils size={14} />
                  <span>ফিচার টেমপ্লেট ১</span>
                </div>
                <h3 className="text-2xl font-bold text-white sm:text-3xl">দৈনিক মিল ক্যালেন্ডার রেজিস্টার</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  মেম্বারদের প্রতিদিনের সকাল, দুপুর ও রাতের মিল সংখ্যা (০ থেকে ৩) সরাসরি এন্ট্রি দিন। মাসের প্রতিটা মেম্বারের মোট মিল সংখ্যা স্বয়ংক্রিয়ভাবে ক্যালকুলেট হয়।
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>মেম্বারওয়ারী মাসিক মোট মিলের স্বয়ংক্রিয় গণনা</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>আগের মাস ও পরের মাসে নেভিগেশনের সুবিধা</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-3xl border border-white/15 bg-slate-900/80 p-3 shadow-2xl backdrop-blur">
                <img
                  src="/calendar-feature.png"
                  alt="Meal Calendar Feature Preview"
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid gap-8 lg:grid-cols-2 items-center lg:grid-flow-dense">
              <div className="lg:col-start-2 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-xl bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-400">
                  <Calculator size={14} />
                  <span>ফিচার টেমপ্লেট ২</span>
                </div>
                <h3 className="text-2xl font-bold text-white sm:text-3xl">স্মার্ট বাজেট ও লাইভ সিমুলেটর</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  টার্গেট মিল রেট দিয়ে জানুন কত টাকা বাজার খরচ কমাতে হবে (Option A) অথবা কতগুলো মোট মিল বাড়ালে (Option B) মিল রেট কাঙ্ক্ষিত টার্গেটে নামবে। সাথে লাইভ সিমুলেটর!
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400" />
                    <span>দ্বিমুখী অপ্টিমাইজেশন স্ট্র্যাটেজি বিশ্লেষণ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400" />
                    <span>লাইভ এক্সট্রা মিল ও বাজার খরচ সিমুলেশন</span>
                  </li>
                </ul>
              </div>
              <div className="lg:col-start-1 rounded-3xl border border-white/15 bg-slate-900/80 p-3 shadow-2xl backdrop-blur">
                <img
                  src="/optimizer-feature.png"
                  alt="Smart Budget Optimizer Preview"
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
            </div>

            {/* Static Interactive Showcase Mockup Card 3 */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400 mb-2">
                    <BarChart3 size={14} />
                    <span>লাইভ সেটেলমেন্ট ডেমো টেমপ্লেট</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">গ্র্যান্ড মান্থলি সেটেলমেন্ট সামারি টেমপ্লেট</h3>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300">
                  অটোমেশন লাইভ ডেমো
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-white/10 uppercase tracking-wider text-slate-400 bg-white/5">
                    <tr>
                      <th className="px-4 py-3 font-semibold">মেম্বার</th>
                      <th className="px-4 py-3 font-semibold text-right">বাসা ভাড়া</th>
                      <th className="px-4 py-3 font-semibold text-right">মেস/ইউটিলিটি নিট ব্যালেন্স</th>
                      <th className="px-4 py-3 font-semibold text-right">সর্বমোট চূড়ান্ত স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <span className="size-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-slate-950 font-black">এসএস</span>
                        শাকিল আহমেদ
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-300">৳ ৩,৫০০.০০</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">+ ৳ ৮৫০.০০</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300">
                          মোট পাবেন ৳ ২,৬৫০.০০
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <span className="size-6 rounded-full bg-teal-500 flex items-center justify-center text-[10px] text-slate-950 font-black">আরএইচ</span>
                        রাকিব হাসান
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-300">৳ ৩,৫০০.০০</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-400">- ৳ ১,২০০.০০</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-300">
                          মোট দিবেন ৳ ৪,৭০০.০০
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        <span className="size-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-slate-950 font-black">এমআই</span>
                        ইমরান হোসেন
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-300">৳ ৩,৫০০.০০</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-400">৳ ০.০০</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-300">
                          হিসাব সমান
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Footer Banner */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-[2.5rem] border border-emerald-500/30 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-10 lg:p-16 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl font-extrabold sm:text-5xl text-white tracking-tight">
                আজই আপনার মেসের হিসাব ডিজিটাল ও স্বচ্ছ করুন!
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                কোনো জটিল সেটআপ ছাড়াই মাত্র ২ মিনিটে আপনার মেসের অ্যাকাউন্ট খুলুন এবং মেম্বারদের যুক্ত করুন।
              </p>
              <div className="pt-4 flex justify-center">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-9 py-4 text-base font-extrabold text-slate-950 shadow-2xl shadow-emerald-500/40 transition hover:scale-105 hover:brightness-110"
                >
                  <span>এখনই ফ্রি মেস অ্যাকাউন্ট খুলুন</span>
                  <ArrowRight size={20} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto max-w-7xl px-6 py-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© 2026 মেসফ্লো (MessFlow) · ডিজিটাল মেস ব্যবস্থাপনা প্ল্যাটফর্ম।</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="/login" className="hover:text-emerald-400 transition">লগইন</a>
            <a href="/signup" className="hover:text-emerald-400 transition">নতুন মেস একাউন্ট</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
