"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from 'next/navigation'
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Plus,
  Receipt,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

type Member = { id: string; name: string; initials: string; color: string; houseRent: number; phone?: string | null };
type MealDay = {
  date: string;
  label: string;
  counts: Record<string, number>;
  lunchCounts: Record<string, number>;
  dinnerCounts: Record<string, number>;
  unassignedCounts: Record<string, number>;
  sources: Record<string, 'manual' | 'planned' | 'automatic'>;
  total: number;
};
type MealSchedule = { id: string; memberId: string; startDate: string; endDate: string; count: number; lunchCount?: number | null; dinnerCount?: number | null };
type TodayOverview =
  | { date: string; dutyNames: string[]; lunch: number; dinner: number; total: number; unassigned: number }
  | { date: string; error: true };
type Utility = { id: string; name: string; amount: number };
type Override = { utilities?: number; mealRate?: number };
type MemberExpenses = Record<string, Record<string, number>>;

type MarketDuty = {
  id: string;
  memberId: string;
  memberName: string;
  memberColor: string;
  memberInitials: string;
  startDay: number;
  endDay: number;
  note?: string;
};

const memberColorPalette = [
  { bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', badge: 'bg-emerald-500 text-white' },
  { bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30', badge: 'bg-indigo-500 text-white' },
  { bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', badge: 'bg-amber-500 text-white' },
  { bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', badge: 'bg-rose-500 text-white' },
  { bg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30', badge: 'bg-sky-500 text-white' },
  { bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30', badge: 'bg-purple-500 text-white' },
];

function getMemberStyle(index: number) {
  return memberColorPalette[index % memberColorPalette.length];
}

type Settlement = Member & {
  meals: number;
  groceries: number;
  mealCost: number;
  mealRate: number;
  mealNet: number;
  utilityShare: number;
  finalCost: number;
  paid: number;
  balance: number;
};

const expenseCategories = [
  "Advance Deposit",
  "Daily Market",
  "Big Market Share",
];

const initialExpenses: MemberExpenses = {};
const initialUtilities: Utility[] = [];

function monthKeyToLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

function getCurrentMonthKey() {
  return getDhakaToday().slice(0, 7)
}

function getDhakaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function changeMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function money(value: number) {
  return `৳ ${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function MealRateBudgetOptimizer({
  totalMeals,
  currentGrocery,
  currentMealRate,
  daysCount,
  selectedMonth,
}: {
  totalMeals: number;
  currentGrocery: number;
  currentMealRate: number;
  daysCount: number;
  selectedMonth: string;
}) {
  const [targetMealRate, setTargetMealRate] = useState<number>(45);
  const [showTips, setShowTips] = useState<boolean>(false);

  // Interactive Simulation Calculator State
  const [simExtraMeals, setSimExtraMeals] = useState<number>(0);
  const [simExtraMarket, setSimExtraMarket] = useState<number>(0);

  useEffect(() => {
    if (currentMealRate > 0 && Math.abs(targetMealRate - 45) < 0.01) {
      const suggested = Math.max(30, Math.floor(currentMealRate));
      setTargetMealRate(suggested);
    }
  }, [currentMealRate]);

  const presets = [35, 40, 45, 50, 55, 60];

  // Strategy A — Keep Meals Fixed, Adjust Grocery
  const allowedGroceryBudget = targetMealRate * totalMeals;
  const requiredSavings = currentGrocery - allowedGroceryBudget;
  const isOverTarget = currentMealRate > targetMealRate && totalMeals > 0;
  const remainingHeadroom = Math.max(0, allowedGroceryBudget - currentGrocery);

  const monthDaysCount = daysCount || 31;
  const currentMonthKey = getCurrentMonthKey();
  let remainingDays = monthDaysCount;

  if (selectedMonth === currentMonthKey) {
    const today = new Date().getDate();
    remainingDays = Math.max(1, monthDaysCount - today + 1);
  } else if (selectedMonth < currentMonthKey) {
    remainingDays = 1;
  } else {
    remainingDays = monthDaysCount;
  }

  const dailyBudgetLimit = isOverTarget
    ? 0
    : remainingDays > 0
    ? remainingHeadroom / remainingDays
    : 0;

  // Strategy B — Keep Grocery Fixed, Adjust Meal Count
  const requiredTotalMeals = targetMealRate > 0 ? Math.ceil(currentGrocery / targetMealRate) : 0;
  const additionalMealsNeeded = Math.max(0, requiredTotalMeals - totalMeals);
  const dailyMealAvgTarget = monthDaysCount > 0 && requiredTotalMeals > 0
    ? (requiredTotalMeals / monthDaysCount).toFixed(1)
    : "0";

  // Interactive Simulation Math
  const simulatedTotalMeals = Math.max(0, totalMeals + simExtraMeals);
  const simulatedTotalGrocery = Math.max(0, currentGrocery + simExtraMarket);
  const simulatedMealRate = simulatedTotalMeals > 0 ? simulatedTotalGrocery / simulatedTotalMeals : 0;
  const rateDiff = simulatedMealRate - currentMealRate;

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                স্মার্ট অপ্টিমাইজার
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  totalMeals === 0
                    ? "bg-muted text-muted-foreground"
                    : isOverTarget
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {totalMeals === 0 ? (
                  "কোনো মিল এন্ট্রি করা হয়নি"
                ) : isOverTarget ? (
                  <>
                    <AlertTriangle size={13} /> টার্গেট অতিক্রম করেছে ⚠️
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> সঠিক ট্র্যাকে আছে 👍
                  </>
                )}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              স্মার্ট বাজেট ও মিল রেট অপ্টিমাইজার
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowTips(!showTips)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
        >
          <Lightbulb size={16} className="text-amber-500" />
          <span>খরচ কমানোর টিপস</span>
          {showTips ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Target Selector */}
      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <label htmlFor="target-meal-rate-slider" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              টার্গেট মিল রেট নির্বাচন (টাকা/মিল)
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-foreground">
                ৳ {targetMealRate}
              </span>
              <span className="text-xs text-muted-foreground">
                (বর্তমান মিল রেট: <strong className="text-foreground">৳ {currentMealRate.toFixed(2)}</strong>)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">টার্গেট প্রিসেট:</span>
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setTargetMealRate(preset)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  targetMealRate === preset
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                ৳ {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground">৳ ২০</span>
          <input
            id="target-meal-rate-slider"
            aria-label="Target Meal Rate"
            type="range"
            min="20"
            max="100"
            step="1"
            value={targetMealRate}
            onChange={(e) => setTargetMealRate(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-border accent-primary"
          />
          <span className="text-xs font-medium text-muted-foreground">৳ ১০০</span>
        </div>
      </div>

      {/* Dual Strategy Cards */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            দ্বিমুখী অপ্টিমাইজেশন স্ট্র্যাটেজি (Multi-Scenario Optimization)
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Card 1: Option A — Control Grocery Budget */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-background p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <TrendingDown size={18} />
                  </span>
                  <div>
                    <h4 className="font-semibold text-foreground text-base">অপশন এ — বাজার বাজেট নিয়ন্ত্রণ</h4>
                    <p className="text-xs text-muted-foreground">Option A: Control Grocery Spending</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  মিল স্থির
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                বর্তমান <strong>{totalMeals} টি</strong> মিল অপরিবর্তিত রেখে মিল রেট <strong>৳ {targetMealRate}</strong> তে নামিয়ে আনতে:
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground font-medium">সর্বোচ্চ বাজার বাজেট অনুমোদিত</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">{money(allowedGroceryBudget)}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    (টার্গেট ৳ {targetMealRate} × {totalMeals} টি মিল)
                  </div>
                </div>

                <div className={`rounded-xl border p-3 ${isOverTarget ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"}`}>
                  <div className="text-xs font-medium">
                    {isOverTarget ? "প্রয়োজনীয় বাজার খরচ হ্রাস" : "বাজেট হেডরুম (অবশিষ্ট বাজেট)"}
                  </div>
                  <div className="text-xl font-bold mt-0.5">
                    {isOverTarget ? `- ${money(requiredSavings)}` : `+ ${money(remainingHeadroom)}`}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {isOverTarget
                      ? "টার্গেটে পৌঁছাতে আরও এত টাকা বাজার কমানো প্রয়োজন"
                      : "আপনার হাতে এখনও অনুমোদিত বাজার করার বাজেট বাকি আছে"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">দৈনিক বাজারের সর্বোচ্চ সীমা ({remainingDays} দিন):</span>
                  <span className="font-bold text-foreground">{money(dailyBudgetLimit)} / প্রতিদিন</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Option B — Increase Meal Volume */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-background p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <TrendingUp size={18} />
                  </span>
                  <div>
                    <h4 className="font-semibold text-foreground text-base">অপশন বি — মিল সংখ্যা বৃদ্ধি</h4>
                    <p className="text-xs text-muted-foreground">Option B: Increase Meal Volume</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  বাজার খরচ স্থির
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                বর্তমান বাজার খরচ <strong>{money(currentGrocery)}</strong> অপরিবর্তিত রেখে মিল রেট <strong>৳ {targetMealRate}</strong> তে নামিয়ে আনতে:
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground font-medium">মাসের প্রয়োজনীয় মোট মিল</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">{requiredTotalMeals} টি মিল</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    (বাজার খরচ {money(currentGrocery)} ÷ টার্গেট ৳ {targetMealRate})
                  </div>
                </div>

                <div className={`rounded-xl border p-3 ${additionalMealsNeeded > 0 ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"}`}>
                  <div className="text-xs font-medium">
                    {additionalMealsNeeded > 0 ? "অতিরিক্ত প্রয়োজনীয় মিল সংখ্যা" : "মিল ভলিউম স্ট্যাটাস"}
                  </div>
                  <div className="text-xl font-bold mt-0.5">
                    {additionalMealsNeeded > 0 ? `+ ${additionalMealsNeeded} টি অতিরিক্ত মিল` : "চলতি মিল সংখ্যাতেই টার্গেট অর্জিত!"}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {additionalMealsNeeded > 0
                      ? "একই বাজার খরচে টার্গেট মিল রেটে পৌঁছাতে অতিরিক্ত মিল প্রয়োজন"
                      : "আপনার বর্তমান মোট মিল টার্গেট পূরণের জন্য যথেষ্ট"}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">দৈনিক গড়ে প্রয়োজনীয় মোট মিল Target:</span>
                  <span className="font-bold text-foreground">{dailyMealAvgTarget} টি/দিন</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              💡 <strong className="text-foreground">স্মার্ট টিপস:</strong> মেম্বারদের অহেতুক মিল অফ রাখা নিরুৎসাহিত করুন। মেসের মোট মিলের সংখ্যা বাড়লে ফিক্সড মশলা, চাল ও তেল খরচ বেশি মিলের মধ্যে ভাগ হয়ে প্রতি মিলের খরচ স্বয়ংক্রিয়ভাবে কমে যায়!
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Calculator */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Calculator size={20} />
            <h3 className="font-semibold text-foreground text-base">ইন্টারেক্টিভ মিল রেট সিমুলেটর (Live Rate Simulation)</h3>
          </div>
          <button
            onClick={() => {
              setSimExtraMeals(0);
              setSimExtraMarket(0);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <RotateCcw size={13} />
            <span>সিমুলেশন রিসেট</span>
          </button>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-foreground mb-1.5">
                <span>অতিরিক্ত সম্ভাব্য মিল সংখ্যা (+ Extra Meals):</span>
                <strong className="text-primary font-bold">{simExtraMeals >= 0 ? `+${simExtraMeals}` : simExtraMeals} টি</strong>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={simExtraMeals}
                  onChange={(e) => setSimExtraMeals(Number(e.target.value) || 0)}
                  className="w-24 rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold text-center outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 20, 30].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSimExtraMeals((prev) => prev + num)}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-foreground mb-1.5">
                <span>অতিরিক্ত সম্ভাব্য বাজার খরচ (+ Extra Market ৳):</span>
                <strong className="text-primary font-bold">{simExtraMarket >= 0 ? `+৳ ${simExtraMarket}` : `৳ ${simExtraMarket}`}</strong>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={simExtraMarket}
                  onChange={(e) => setSimExtraMarket(Number(e.target.value) || 0)}
                  className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold text-center outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[200, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSimExtraMarket((prev) => prev + amt)}
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      +৳{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Output Display */}
          <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">সিমুলেটেড ফলাফল পূর্বরূপ</span>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
                <span className="text-muted-foreground block text-[11px]">অনুমিত মোট মিল</span>
                <strong className="text-foreground text-sm font-bold block mt-0.5">{simulatedTotalMeals} টি</strong>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-2.5">
                <span className="text-muted-foreground block text-[11px]">অনুমিত মোট বাজার</span>
                <strong className="text-foreground text-sm font-bold block mt-0.5">{money(simulatedTotalGrocery)}</strong>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-3">
              <div>
                <span className="text-xs font-semibold text-primary block">ফলাফল নতুন মিল রেট:</span>
                <span className="text-2xl font-black text-foreground">৳ {simulatedMealRate.toFixed(2)}</span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">মিল রেটে প্রভাব:</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  rateDiff < 0
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : rateDiff > 0
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {rateDiff < 0
                    ? `৳ ${Math.abs(rateDiff).toFixed(2)} কমবে 📉`
                    : rateDiff > 0
                    ? `৳ ${rateDiff.toFixed(2)} বাড়বে 📈`
                    : "কোনো পরিবর্তন নেই"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTips && (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 transition-all">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
            <Lightbulb size={18} />
            <span>মিল রেট কম রাখার কার্যকরী উপায়সমূহ</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs text-foreground/90">
            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
              <strong className="text-primary block mb-1">📦 পাইকারি কেনাকাটা (Big Market)</strong>
              চাল, সয়াবিন তেল, ডাল, পেঁয়াজ ও মশলা মাসের শুরুতে পাইকারি বা বড় বাজারে একসাথে কিনলে ১০-২০% খরচ বাঁচে।
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
              <strong className="text-primary block mb-1">📋 বাজারের তালিকা মেইনটেইন</strong>
              দৈনিক বাজারে যাওয়ার আগে সুনির্দিষ্ট ফর্দ তৈরি করুন যাতে অতিরিক্ত বা অপ্রয়োজনীয় কেনাকাটা বন্ধ হয়।
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
              <strong className="text-primary block mb-1">🥗 সুষম খাবার পরিকল্পনা</strong>
              প্রতিদিন ভারী মাছ/মাংসের পরিবর্তে সপ্তাহে কয়েকদিন ডিম, ডাল ও সবজির আইটেম রাখলে মিল রেট নিয়ন্ত্রণে থাকে।
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs">
              <strong className="text-primary block mb-1">⚖️ সঠিক মিল অফ এন্ট্রি</strong>
              মেসের মেম্বাররা বাইরে গেলে বা বাড়িতে গেলে আগে থেকে মিল অফ রাখা নিশ্চিত করুন যাতে সঠিক মিল গণনা হয়।
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function MessFlowDashboard({ defaultTab }: { defaultTab?: string } = {}) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<MealDay[]>([]);
  const [mealSchedules, setMealSchedules] = useState<MealSchedule[]>([]);
  const [isMealScheduleOpen, setIsMealScheduleOpen] = useState(false);
  const [editingMealScheduleId, setEditingMealScheduleId] = useState<string | null>(null);
  const [scheduleMemberId, setScheduleMemberId] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleLunchCount, setScheduleLunchCount] = useState('1');
  const [scheduleDinnerCount, setScheduleDinnerCount] = useState('1');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let lastDate = getDhakaToday();
    const timer = window.setInterval(() => {
      const today = getDhakaToday();
      if (today !== lastDate) {
        lastDate = today;
        setReloadKey((key) => key + 1);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [expenses, setExpenses] = useState<MemberExpenses>({});
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [customActualGrocery, setCustomActualGrocery] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [activeNav, setActiveNav] = useState(defaultTab || "Overview");
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Loading shared data…");
  const [loadedMonth, setLoadedMonth] = useState('');
  const [todayOverview, setTodayOverview] = useState<TodayOverview | null>(null);
  const todayDate = getDhakaToday();
  const dirtyMealKeys = useRef(new Set<string>());
  const mealSaveQueues = useRef(new Map<string, Promise<unknown>>());
  const [messProfile, setMessProfile] = useState<{ messName?: string; managerName?: string } | null>(null);

  // Market Duty Schedule State
  const [marketDuties, setMarketDuties] = useState<MarketDuty[]>([]);
  const [isMarketDutyModalOpen, setIsMarketDutyModalOpen] = useState(false);
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);
  const [dutyMemberId, setDutyMemberId] = useState("");
  const [dutyStartDay, setDutyStartDay] = useState(1);
  const [dutyEndDay, setDutyEndDay] = useState(7);
  const [dutyNote, setDutyNote] = useState("");
  const [dutyDeleteTarget, setDutyDeleteTarget] = useState<MarketDuty | null>(null);

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRent, setNewMemberRent] = useState("");

  const [isAddUtilityOpen, setIsAddUtilityOpen] = useState(false);
  const [newUtilityName, setNewUtilityName] = useState("");
  const [newUtilityAmount, setNewUtilityAmount] = useState("");

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'member' | 'utility', id: string, name: string } | null>(null);

  async function persist(payload: Record<string, unknown>) {
    setSyncStatus("Saving…");
    try {
      const response = await fetch(`/api/messflow?month=${selectedMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Save failed");
      setSyncStatus("Saved to MongoDB");
      return true;
    } catch {
      setSyncStatus("Local changes only — add MONGODB_URI to sync");
      return false;
    }
  }

  function logout() {
    setIsLogoutOpen(true);
  }

  async function handleLogoutConfirm() {
    setIsLogoutOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (response) => {
        const session = await response.json();
        if (session?.authenticated) {
          setMessProfile({
            messName: session.user?.messName,
            managerName: session.user?.managerName,
          });
        }
      })
      .catch(() => undefined);

    fetch(`/api/messflow?month=${selectedMonth}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error("Database unavailable");
        const data = await response.json();
        const nextMembers = data.members.map(
          (member: Member & { id: string; externalId: string; houseRent?: number }) => {
            const hr = data.houseRents?.find(
              (h: { memberId: string; amount: number }) => h.memberId === member.id
            );
            return {
              id: member.externalId,
              name: member.name,
              initials: member.initials,
              color: member.color,
              phone: member.phone ?? '',
              houseRent: hr !== undefined ? (Number(hr.amount) || 0) : (Number(member.houseRent) || 0),
            };
          },
        );
        setMembers(nextMembers);
        setMealSchedules((data.mealSchedules || []).map((schedule: MealSchedule) => ({
          ...schedule,
          memberId: data.members.find((member: { id: string; externalId: string }) => member.id === schedule.memberId)?.externalId ?? schedule.memberId,
        })));
        setDays(
          data.days.map(
            (day: {
              date: string;
              label: string;
              entries: { memberId: string; count: number; lunchCount: number; dinnerCount: number; unassignedCount: number; source: 'manual' | 'planned' | 'automatic' }[];
            }) => ({
              date: day.date,
              label: day.label,
              counts: Object.fromEntries(
                day.entries.map((entry) => [
                  data.members.find(
                    (member: { id: string; externalId: string }) =>
                      member.id === entry.memberId,
                  )?.externalId,
                  entry.count,
                ]),
              ),
              lunchCounts: Object.fromEntries(day.entries.map((entry) => [data.members.find((member: { id: string; externalId: string }) => member.id === entry.memberId)?.externalId, entry.lunchCount])),
              dinnerCounts: Object.fromEntries(day.entries.map((entry) => [data.members.find((member: { id: string; externalId: string }) => member.id === entry.memberId)?.externalId, entry.dinnerCount])),
              unassignedCounts: Object.fromEntries(day.entries.map((entry) => [data.members.find((member: { id: string; externalId: string }) => member.id === entry.memberId)?.externalId, entry.unassignedCount])),
              sources: Object.fromEntries(
                day.entries.map((entry) => [
                  data.members.find((member: { id: string; externalId: string }) => member.id === entry.memberId)?.externalId,
                  entry.source,
                ]),
              ),
              total: day.entries.reduce((sum, entry) => sum + entry.count, 0),
            }),
          ),
        );
        setExpenses(
          data.expenses.reduce(
            (acc: MemberExpenses, expense: { memberId: string; category: string; amount: number }) => {
              const memberKey = data.members.find(
                (member: { id: string; externalId: string }) =>
                  member.id === expense.memberId,
              )?.externalId;
              if (!memberKey) return acc;
              return {
                ...acc,
                [memberKey]: {
                  ...acc[memberKey],
                  [expense.category]: expense.amount,
                },
              };
            },
            {},
          ),
        );
        setUtilities(
          data.utilities.map((utility: Utility & { externalId: string }) => ({
            id: utility.externalId,
            name: utility.name,
            amount: utility.amount,
          })),
        );
        setOverrides(
          Object.fromEntries(
            data.overrides.map(
              (override: {
                memberId: string;
                utilities?: number;
                mealRate?: number;
              }) => [
                data.members.find(
                  (member: { id: string; externalId: string }) =>
                    member.id === override.memberId,
                )?.externalId,
                {
                  utilities: override.utilities ?? undefined,
                  mealRate: override.mealRate ?? undefined,
                },
              ],
            ),
          ),
        );
        const actualRec = data.actualGroceries?.[0];
        setCustomActualGrocery(
          typeof actualRec?.amount === "number" ? actualRec.amount : null,
        );

        const nextMarketDuties = (data.marketDuties || []).map((duty: {
          id: string;
          memberId: string;
          startDay: number;
          endDay: number;
          note?: string;
          member?: { externalId: string; name: string; color: string; initials: string };
        }) => {
          const m = data.members.find((mb: { id: string; externalId: string; name: string; color: string; initials: string }) => mb.id === duty.memberId || mb.externalId === duty.memberId) || duty.member;
          return {
            id: duty.id,
            memberId: m?.externalId || duty.memberId,
            memberName: m?.name || 'মেম্বার',
            memberColor: m?.color || 'bg-primary',
            memberInitials: m?.initials || m?.name?.slice(0, 2).toUpperCase() || 'MB',
            startDay: duty.startDay,
            endDay: duty.endDay,
            note: duty.note || '',
          };
        });
        setMarketDuties(nextMarketDuties);
        setLoadedMonth(selectedMonth);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`messflow_market_duties_${selectedMonth}`, JSON.stringify(nextMarketDuties));
        }

        setSyncStatus("Synced with MongoDB");
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const savedLocal = localStorage.getItem(`messflow_market_duties_${selectedMonth}`);
          if (savedLocal) {
            try { setMarketDuties(JSON.parse(savedLocal)); } catch {}
          }
        }
        setSyncStatus("Unable to sync with MongoDB");
      });
  }, [selectedMonth, reloadKey]);

  useEffect(() => {
    if (activeNav !== 'Overview' && activeNav !== 'ওভারভিউ') return;
    if (selectedMonth === todayDate.slice(0, 7)) return;
    const controller = new AbortController();
    const todayDay = Number(todayDate.slice(8, 10));

    fetch(`/api/messflow?month=${todayDate.slice(0, 7)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Today data unavailable');
        const data = await response.json();
        const day = data.days.find((item: { date: string }) => item.date === todayDate.slice(8, 10));
        const entries = (day?.entries ?? []) as { count: number; lunchCount: number; dinnerCount: number; unassignedCount: number }[];
        const dutyNames = (data.marketDuties ?? [])
          .filter((duty: { startDay: number; endDay: number }) => duty.startDay <= todayDay && todayDay <= duty.endDay)
          .map((duty: { memberId: string; member?: { name: string } }) => duty.member?.name ?? data.members.find((member: { id: string; name: string }) => member.id === duty.memberId)?.name ?? 'মেম্বার');
        if (!controller.signal.aborted) {
          setTodayOverview({
            date: todayDate,
            dutyNames,
            lunch: entries.reduce((sum, entry) => sum + entry.lunchCount, 0),
            dinner: entries.reduce((sum, entry) => sum + entry.dinnerCount, 0),
            total: entries.reduce((sum, entry) => sum + entry.count, 0),
            unassigned: entries.reduce((sum, entry) => sum + entry.unassignedCount, 0),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setTodayOverview({ date: todayDate, error: true });
      });

    return () => controller.abort();
  }, [activeNav, reloadKey, selectedMonth, todayDate]);

  const isCurrentMonthLoaded = selectedMonth === todayDate.slice(0, 7) && loadedMonth === selectedMonth;
  const liveTodayDay = isCurrentMonthLoaded ? days.find((day) => day.date === todayDate.slice(8, 10)) : null;
  const liveTodayOverview = liveTodayDay ? {
    date: todayDate,
    dutyNames: marketDuties
      .filter((duty) => duty.startDay <= Number(todayDate.slice(8, 10)) && Number(todayDate.slice(8, 10)) <= duty.endDay)
      .map((duty) => duty.memberName),
    lunch: members.reduce((sum, member) => sum + (liveTodayDay.lunchCounts[member.id] ?? 0), 0),
    dinner: members.reduce((sum, member) => sum + (liveTodayDay.dinnerCounts[member.id] ?? 0), 0),
    total: liveTodayDay.total,
    unassigned: members.reduce((sum, member) => sum + (liveTodayDay.unassignedCounts[member.id] ?? 0), 0),
  } : null;
  const currentTodayOverview = selectedMonth === todayDate.slice(0, 7)
    ? liveTodayOverview
    : todayOverview?.date === todayDate && !('error' in todayOverview) ? todayOverview : null;
  const todayOverviewFailed = selectedMonth === todayDate.slice(0, 7)
    ? syncStatus === 'Unable to sync with MongoDB'
    : todayOverview?.date === todayDate && 'error' in todayOverview;

  const calculated = useMemo(() => {
    const totalMeals = days.reduce(
      (sum, day) =>
        sum +
        members.reduce(
          (inner, member) => inner + (day.counts[member.id] ?? 0),
          0,
        ),
      0,
    );
    const totalDepositCollected = Object.values(expenses).reduce(
      (sum, categories) =>
        sum +
        Object.values(categories).reduce(
          (categorySum, amount) => categorySum + (Number(amount) || 0),
          0,
        ),
      0,
    );
    const totalBigMarketCollected = Object.values(expenses).reduce(
      (sum, categories) => sum + (Number(categories["Big Market Share"]) || 0),
      0,
    );
    const totalDailyAndAdvanceCollected = Object.values(expenses).reduce(
      (sum, categories) =>
        sum +
        (Number(categories["Advance Deposit"]) || 0) +
        (Number(categories["Daily Market"]) || 0),
      0,
    );

    const isCustomActualSet = customActualGrocery !== null && customActualGrocery !== undefined;
    const actualBigMarketSpent = isCustomActualSet ? Number(customActualGrocery) : totalBigMarketCollected;
    const managerBigMarketCashInHand = totalBigMarketCollected - actualBigMarketSpent;
    const totalMessGroceryCost = totalDailyAndAdvanceCollected + actualBigMarketSpent;
    const mealRate = totalMeals ? totalMessGroceryCost / totalMeals : 0;
    const utilityTotal = utilities.reduce(
      (sum, utility) => sum + (Number(utility.amount) || 0),
      0,
    );
    const customUtilityTotal = members.reduce((sum, member) => {
      const customShare = overrides[member.id]?.utilities;
      return sum + (customShare !== undefined ? Number(customShare) : 0);
    }, 0);
    const customMemberCount = members.reduce(
      (count, member) =>
        count + (overrides[member.id]?.utilities !== undefined ? 1 : 0),
      0,
    );
    const defaultMemberCount = Math.max(0, members.length - customMemberCount);
    const remainingUtilityBill = utilityTotal - customUtilityTotal;
    const defaultUtilityShare =
      defaultMemberCount > 0
        ? remainingUtilityBill / defaultMemberCount
        : members.length
        ? utilityTotal / members.length
        : 0;
    const settlements: Settlement[] = members.map((member) => {
      const meals = days.reduce(
        (sum, day) => sum + (day.counts[member.id] ?? 0),
        0,
      );
      const totalGiven = Object.values(expenses[member.id] ?? {}).reduce(
        (sum, amount) => sum + (Number(amount) || 0),
        0,
      );
      const effectiveMealRate = overrides[member.id]?.mealRate ?? mealRate;
      const mealCost = meals * effectiveMealRate;
      const customShare = overrides[member.id]?.utilities;
      const utilityShare =
        customShare !== undefined ? customShare : defaultUtilityShare;
      const finalCost = mealCost + utilityShare;
      const mealNet = totalGiven - mealCost;
      const balance = totalGiven - finalCost;
      return {
        ...member,
        meals,
        groceries: totalGiven,
        mealCost,
        mealRate: effectiveMealRate,
        mealNet,
        utilityShare,
        finalCost,
        paid: totalGiven,
        balance,
      };
    });

    const totalApartmentRent = members.reduce(
      (sum, member) => sum + (Number(member.houseRent) || 0),
      0,
    );

    const grandSettlements = settlements.map((row) => {
      const grandTotalPayable = (Number(row.houseRent) || 0) - row.balance;
      return {
        ...row,
        houseRent: Number(row.houseRent) || 0,
        grandTotalPayable,
      };
    });

    return {
      totalMeals,
      totalDepositCollected,
      totalBigMarketCollected,
      totalDailyAndAdvanceCollected,
      actualBigMarketSpent,
      managerBigMarketCashInHand,
      managerCashInHand: managerBigMarketCashInHand,
      isCustomActualSet,
      grocerySpend: totalMessGroceryCost,
      actualGrocerySpend: totalMessGroceryCost,
      mealRate,
      utilityTotal,
      customUtilityTotal,
      customMemberCount,
      defaultMemberCount,
      remainingUtilityBill,
      defaultUtilityShare,
      settlements,
      grandSettlements,
      totalApartmentRent,
      totalCost: totalMessGroceryCost + utilityTotal,
    };
  }, [days, expenses, members, utilities, overrides, customActualGrocery]);

  function updateMeal(dayIndex: number, memberId: string, sitting: 'lunch' | 'dinner', value: string) {
    const count = value === '' ? 0 : Number(value);
    if (!Number.isSafeInteger(count) || count < 0) return;
    const day = days[dayIndex];
    if (!day) return;
    const otherCount = sitting === 'lunch' ? day.dinnerCounts[memberId] ?? 0 : day.lunchCounts[memberId] ?? 0;
    if (!Number.isSafeInteger(count + otherCount)) return;
    dirtyMealKeys.current.add(`${day.date}:${memberId}`);
    setDays((current) =>
      current.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              counts: { ...day.counts, [memberId]: count + (sitting === 'lunch' ? day.dinnerCounts[memberId] ?? 0 : day.lunchCounts[memberId] ?? 0) },
              lunchCounts: sitting === 'lunch' ? { ...day.lunchCounts, [memberId]: count } : day.lunchCounts,
              dinnerCounts: sitting === 'dinner' ? { ...day.dinnerCounts, [memberId]: count } : day.dinnerCounts,
              unassignedCounts: { ...day.unassignedCounts, [memberId]: 0 },
              sources: { ...day.sources, [memberId]: 'manual' },
              total: day.total - (day.counts[memberId] ?? 0) + count + (sitting === 'lunch' ? day.dinnerCounts[memberId] ?? 0 : day.lunchCounts[memberId] ?? 0),
            }
          : day,
      ),
    );
  }

  function saveMeal(dayIndex: number, memberId: string) {
    const day = days[dayIndex];
    if (!day) return;
    const key = `${selectedMonth}:${day.date}:${memberId}`;
    if (!dirtyMealKeys.current.delete(`${day.date}:${memberId}`)) return;
    const payload = { action: 'meal', dayId: day.date, memberId, lunchCount: day.lunchCounts[memberId] ?? 0, dinnerCount: day.dinnerCounts[memberId] ?? 0 };
    const previous = mealSaveQueues.current.get(key) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(() => persist(payload));
    mealSaveQueues.current.set(key, pending);
    void pending.finally(() => {
      if (mealSaveQueues.current.get(key) === pending) mealSaveQueues.current.delete(key);
    });
  }

  function openMealSchedule(schedule?: MealSchedule) {
    setEditingMealScheduleId(schedule?.id ?? null);
    setScheduleMemberId(schedule?.memberId ?? members[0]?.id ?? '');
    const today = getDhakaToday();
    const defaultDate = selectedMonth === today.slice(0, 7) ? today : `${selectedMonth}-01`;
    setScheduleStartDate(schedule?.startDate ?? defaultDate);
    setScheduleEndDate(schedule?.endDate ?? defaultDate);
    setScheduleLunchCount(schedule ? String(schedule.lunchCount ?? (schedule.count === 2 ? 1 : schedule.count === 0 ? 0 : '')) : '1');
    setScheduleDinnerCount(schedule ? String(schedule.dinnerCount ?? (schedule.count === 2 ? 1 : schedule.count === 0 ? 0 : '')) : '1');
    setScheduleError('');
    setIsMealScheduleOpen(true);
  }

  async function submitMealSchedule(event: React.FormEvent) {
    event.preventDefault();
    const lunchCount = Number(scheduleLunchCount);
    const dinnerCount = Number(scheduleDinnerCount);
    if (!scheduleMemberId || scheduleStartDate > scheduleEndDate) {
      setScheduleError('সঠিক সদস্য ও তারিখ নির্বাচন করুন।');
      return;
    }
    if (scheduleLunchCount === '' || scheduleDinnerCount === '' || !Number.isSafeInteger(lunchCount) || !Number.isSafeInteger(dinnerCount) || lunchCount < 0 || dinnerCount < 0 || !Number.isSafeInteger(lunchCount + dinnerCount)) {
      setScheduleError('দুপুর ও রাতের জন্য শূন্য বা তার বেশি পূর্ণসংখ্যা লিখুন।');
      return;
    }
    setScheduleSaving(true);
    setScheduleError('');
    try {
      const response = await fetch(`/api/messflow?month=${selectedMonth}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mealSchedule', id: editingMealScheduleId ?? undefined, memberId: scheduleMemberId, startDate: scheduleStartDate, endDate: scheduleEndDate, lunchCount, dinnerCount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'পরিকল্পনা সংরক্ষণ করা যায়নি।');
      setIsMealScheduleOpen(false);
      if (selectedMonth === scheduleStartDate.slice(0, 7)) {
        setReloadKey((key) => key + 1);
      } else {
        setSelectedMonth(scheduleStartDate.slice(0, 7));
      }
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'পরিকল্পনা সংরক্ষণ করা যায়নি।');
    } finally {
      setScheduleSaving(false);
    }
  }

  async function removeMealSchedule(schedule: MealSchedule) {
    if (!window.confirm('এই মিল পরিকল্পনাটি বাতিল করবেন?')) return;
    try {
      const response = await fetch(`/api/messflow?month=${selectedMonth}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mealScheduleRemove', id: schedule.id }),
      });
      if (!response.ok) throw new Error('পরিকল্পনা বাতিল করা যায়নি।');
      setReloadKey((key) => key + 1);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'পরিকল্পনা বাতিল করা যায়নি।');
    }
  }

  function addMember() {
    setIsAddMemberOpen(true);
  }

  function handleAddMemberSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    const id = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const houseRent = Math.max(0, Number(newMemberRent) || 0);
    const phone = newMemberPhone.trim() || undefined;

    setMembers((current) => [
      ...current,
      {
        id,
        name,
        initials: name.slice(0, 2).toUpperCase(),
        color: "bg-primary",
        phone,
        houseRent,
      },
    ]);
    setExpenses((current) => ({ ...current, [id]: {} }));
    void persist({ action: "member", externalId: id, name, houseRent, phone }).then((saved) => {
      if (saved) setReloadKey((key) => key + 1);
    });
    setNewMemberName("");
    setNewMemberRent("");
    setNewMemberPhone("");
    setIsAddMemberOpen(false);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
    setExpenses((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setOverrides((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDays((current) =>
      current.map((day) => {
        const counts = { ...day.counts };
        const lunchCounts = { ...day.lunchCounts };
        const dinnerCounts = { ...day.dinnerCounts };
        const unassignedCounts = { ...day.unassignedCounts };
        delete counts[id];
        delete lunchCounts[id];
        delete dinnerCounts[id];
        delete unassignedCounts[id];
        return {
          ...day,
          counts,
          lunchCounts,
          dinnerCounts,
          unassignedCounts,
          total: Object.values(counts).reduce((sum, item) => sum + item, 0),
        };
      }),
    );
    void persist({ action: "memberRemove", memberId: id });
  }

  function updateMemberName(id: string, name: string) {
    const normalized = name.trim();
    if (!normalized) return;
    setMembers((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              name: normalized,
              initials: normalized.slice(0, 2).toUpperCase(),
            }
          : member,
      ),
    );
    void persist({ action: "memberUpdate", memberId: id, name: normalized });
  }

  function updateMemberPhone(id: string, phone: string) {
    const normalized = phone.trim();
    setMembers((current) =>
      current.map((member) =>
        member.id === id ? { ...member, phone: normalized } : member,
      ),
    );
    void persist({ action: "memberUpdate", memberId: id, phone: normalized });
  }

  function updateExpense(memberId: string, category: string, amount: number) {
    setExpenses((current) => ({
      ...current,
      [memberId]: {
        ...current[memberId],
        [category]: amount,
      },
    }));
    void persist({ action: "expense", memberId, category, amount });
  }

  function updateUtility(id: string, nextName: string, nextAmount: number) {
    setUtilities((current) =>
      current.map((utility) =>
        utility.id === id
          ? { ...utility, name: nextName, amount: nextAmount }
          : utility,
      ),
    );
    void persist({ action: "utility", id, name: nextName, amount: nextAmount });
  }

  function removeUtility(id: string) {
    setUtilities((current) => current.filter((utility) => utility.id !== id));
    void persist({ action: "utilityRemove", id });
  }

  function updateOverride(memberId: string, utilitiesValue: string) {
    const utilities =
      utilitiesValue === "" ? undefined : Number(utilitiesValue);
    setOverrides((current) => ({
      ...current,
      [memberId]: { ...current[memberId], utilities },
    }));
    void persist({
      action: "override",
      memberId,
      utilities,
      mealRate: overrides[memberId]?.mealRate,
    });
  }

  function updateHouseRent(memberId: string, houseRentValue: string) {
    const houseRent = Math.max(0, Number(houseRentValue) || 0);
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? { ...member, houseRent }
          : member,
      ),
    );
    void persist({ action: "rent", memberId, houseRent });
  }

  function updateActualGrocery(value: string | number | null) {
    const amount = value === "" || value === null ? null : Math.max(0, Number(value) || 0);
    setCustomActualGrocery(amount);
    void persist({ action: "actualGrocery", amount });
  }

  function addUtility() {
    setIsAddUtilityOpen(true);
  }

  function handleAddUtilitySubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = newUtilityName.trim();
    if (!name) return;
    const amount = Number(newUtilityAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) return;

    const id = `${name}-${Date.now()}`;
    setUtilities((current) => [...current, { id, name, amount }]);
    void persist({ action: "utility", id, name, amount });

    setNewUtilityName("");
    setNewUtilityAmount("");
    setIsAddUtilityOpen(false);
  }

  function confirmDeleteTarget() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'member') {
      removeMember(deleteTarget.id);
    } else if (deleteTarget.type === 'utility') {
      removeUtility(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  function exportXlsx() {
    const rows = calculated.grandSettlements.map(
      ({
        name,
        houseRent,
        meals,
        mealRate,
        groceries,
        mealCost,
        mealNet,
        utilityShare,
        finalCost,
        balance,
        grandTotalPayable,
      }) => ({
        মেম্বার: name,
        "বাসা ভাড়া": houseRent.toFixed(2),
        "মোট মিল": meals,
        "মিল রেট": mealRate ? mealRate.toFixed(2) : "0.00",
        "মোট বাজার জমা (E)": groceries,
        "মিল খরচ (G)": mealCost.toFixed(2),
        "মিল নিট ব্যালেন্স (E - G)": mealNet.toFixed(2),
        "ইউটিলিটি শেয়ার (I)": utilityShare.toFixed(2),
        "সর্বমোট খরচ (G + I)": finalCost.toFixed(2),
        "ফাইনাল সেটেলমেন্ট ব্যালেন্স": balance.toFixed(2),
        "ফাইনাল স্ট্যাটাস": Math.abs(balance) < 0.005 ? "হিসাব সমান" : balance > 0 ? `পাবেন ${money(balance)}` : `দিবেন ${money(Math.abs(balance))}`,
        "সর্বমোট প্রদেয়/আদায়যোগ্য": grandTotalPayable.toFixed(2),
        "গ্র্যান্ড স্ট্যাটাস": Math.abs(grandTotalPayable) < 0.005 ? "হিসাব সমান" : grandTotalPayable > 0 ? `মোট দিবেন ${money(grandTotalPayable)}` : `মোট পাবেন ${money(Math.abs(grandTotalPayable))}`,
      }),
    );
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "সেটেলমেন্ট");
    XLSX.writeFile(
      workbook,
      `messflow-${monthKeyToLabel(selectedMonth).toLowerCase().replaceAll(" ", "-")}.xlsx`,
    );
  }

  function exportPdf() {
    window.print();
  }

  function handleOpenAddDuty(defaultStartDay?: number) {
    setEditingDutyId(null);
    setDutyMemberId(members[0]?.id || "");
    const start = defaultStartDay || 1;
    setDutyStartDay(start);
    setDutyEndDay(Math.min(start + 6, 30));
    setDutyNote("");
    setIsMarketDutyModalOpen(true);
  }

  function handleOpenEditDuty(duty: MarketDuty) {
    setEditingDutyId(duty.id);
    setDutyMemberId(duty.memberId);
    setDutyStartDay(duty.startDay);
    setDutyEndDay(duty.endDay);
    setDutyNote(duty.note || "");
    setIsMarketDutyModalOpen(true);
  }

  async function handleSaveMarketDuty(e: React.FormEvent) {
    e.preventDefault();
    if (!dutyMemberId) return;

    const newStart = Math.min(dutyStartDay, dutyEndDay);
    const newEnd = Math.max(dutyStartDay, dutyEndDay);

    // Strict 1 Person Per Date: Resolve overlaps with existing duties
    const processedDuties: MarketDuty[] = [];

    for (const ex of marketDuties) {
      if (editingDutyId && ex.id === editingDutyId) continue;

      const overlaps = Math.max(ex.startDay, newStart) <= Math.min(ex.endDay, newEnd);

      if (!overlaps) {
        processedDuties.push(ex);
      } else {
        if (newStart <= ex.startDay && ex.endDay <= newEnd) {
          // Completely covered -> drop
          continue;
        } else if (ex.startDay < newStart && ex.endDay <= newEnd) {
          // Truncate end
          processedDuties.push({ ...ex, endDay: newStart - 1 });
        } else if (newStart <= ex.startDay && newEnd < ex.endDay) {
          // Truncate start
          processedDuties.push({ ...ex, startDay: newEnd + 1 });
        } else if (ex.startDay < newStart && newEnd < ex.endDay) {
          // Spans over -> Split into two
          const originalEnd = ex.endDay;
          processedDuties.push({ ...ex, endDay: newStart - 1 });
          processedDuties.push({
            ...ex,
            id: `duty-${Date.now()}-split`,
            startDay: newEnd + 1,
            endDay: originalEnd,
          });
        }
      }
    }

    const member = members.find((m) => m.id === dutyMemberId);
    const updatedDuty: MarketDuty = {
      id: editingDutyId || `duty-${Date.now()}`,
      memberId: dutyMemberId,
      memberName: member?.name || "মেম্বার",
      memberColor: member?.color || "bg-primary",
      memberInitials: member?.initials || "MB",
      startDay: newStart,
      endDay: newEnd,
      note: dutyNote.trim(),
    };

    processedDuties.push(updatedDuty);
    processedDuties.sort((a, b) => a.startDay - b.startDay);

    setMarketDuties(processedDuties);
    if (typeof window !== "undefined") {
      localStorage.setItem(`messflow_market_duties_${selectedMonth}`, JSON.stringify(processedDuties));
    }
    setIsMarketDutyModalOpen(false);

    await persist({
      action: "marketDuty",
      id: editingDutyId || undefined,
      memberId: dutyMemberId,
      startDay: newStart,
      endDay: newEnd,
      note: dutyNote.trim() || null,
    });
  }

  async function handleDeleteMarketDutyConfirm() {
    if (!dutyDeleteTarget) return;
    const targetId = dutyDeleteTarget.id;
    setDutyDeleteTarget(null);

    const nextDuties = marketDuties.filter((d) => d.id !== targetId);
    setMarketDuties(nextDuties);
    if (typeof window !== "undefined") {
      localStorage.setItem(`messflow_market_duties_${selectedMonth}`, JSON.stringify(nextDuties));
    }

    await persist({
      action: "marketDutyRemove",
      id: targetId,
    });
  }

  const nav = [
    { label: "ওভারভিউ", icon: LayoutDashboard },
    { label: "মিল ক্যালেন্ডার", icon: Utensils },
    { label: "বাজার খরচ", icon: Receipt },
    { label: "বাজার সময়সূচি", icon: CalendarDays },
    { label: "ইউটিলিটি ও বিল", icon: SlidersHorizontal },
    { label: "মেম্বারবৃন্দ", icon: Users },
    { label: "সেটিংস", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-sidebar px-5 py-6 transition-transform lg:translate-x-0 ${showMobileNav ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 p-1 shadow-sm">
              <img
                src="/messflow-logo.png"
                alt="MessFlow Official Logo"
                className="size-full object-contain rounded-xl"
              />
            </div>
            <div>
              <p className="font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                <span>মেসফ্লো</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">PRO</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                ডিজিটাল মেস প্ল্যাটফর্ম
              </p>
            </div>
          </div>
          <IconButton
            label="মেডু বন্ধ করুন"
            onClick={() => setShowMobileNav(false)}
          >
            <X size={18} />
          </IconButton>
        </div>
        <nav
          className="mt-12 flex flex-1 flex-col gap-2"
          aria-label="Primary navigation"
        >
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                setShowMobileNav(false);
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeNav === label ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <CircleDollarSign size={17} />
            <span className="text-xs font-semibold uppercase tracking-widest">
              মাসিক মোট খরচ
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {money(calculated.totalCost)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            বাজার + ইউটিলিটি বিল
          </p>
        </div>
      </aside>
      {showMobileNav && (
        <button
          aria-label="অভারলে বন্ধ করুন"
          className="fixed inset-0 z-20 bg-background/70 lg:hidden"
          onClick={() => setShowMobileNav(false)}
        />
      )}

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5 md:px-8 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <IconButton
              label="মেডু খুলুন"
              onClick={() => setShowMobileNav(true)}
            >
              <Menu size={20} />
            </IconButton>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {messProfile?.managerName ? `স্বাগতম, ${messProfile.managerName}` : 'স্বাগতম'}
              </p>
              <h1 className="text-xl font-semibold tracking-tight">
                {messProfile?.messName ?? 'আপনার মেস'} · {activeNav === "Overview" || activeNav === "ওভারভিউ" ? "মেসের ওভারভিউ" : activeNav}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
              <button
                title="আগের মাস"
                onClick={() => setSelectedMonth(changeMonthKey(selectedMonth, -1))}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">আগের মাস</span>
              </button>
              
              <div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-foreground">
                <CalendarDays size={16} className="text-primary" />
                <span>{monthKeyToLabel(selectedMonth)}</span>
              </div>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="cursor-pointer rounded-lg bg-transparent px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none"
              />

              <button
                title="পরের মাস"
                onClick={() => setSelectedMonth(changeMonthKey(selectedMonth, 1))}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <span className="hidden sm:inline">পরের মাস</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedMonth !== getCurrentMonthKey() && (
              <button
                onClick={() => setSelectedMonth(getCurrentMonthKey())}
                className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                চলতি মাস
              </button>
            )}

            <button
              onClick={exportXlsx}
              className="hidden items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent md:flex"
            >
              <ArrowDownToLine size={16} />
              এক্সেল ডাউনলোড
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <FileText size={16} />
              পিডিএফ
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
            >
              লগআউট
            </button>
          </div>
        </header>

        <div className={`mx-auto w-full py-8 ${activeNav === 'Meals' || activeNav === 'মিল ক্যালেন্ডার' ? 'max-w-none px-2 sm:px-3 md:px-4' : 'max-w-[1500px] px-4 sm:px-5 md:px-8'}`}>
          {/* Top Page Navigation Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4 print:hidden">
            {nav.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeNav === label
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Welcome Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-primary">
                {monthKeyToLabel(selectedMonth)} · {messProfile?.messName ?? 'আপনার মেস'}
              </p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                {(activeNav === "Overview" || activeNav === "ওভারভিউ") && "মেসের ওভারভিউ ও ফিন্যান্সিয়াল সামারি"}
                {(activeNav === "Meals" || activeNav === "মিল ক্যালেন্ডার") && "দৈনিক মিল ক্যালেন্ডার রেজিস্টার"}
                {(activeNav === "Expenses" || activeNav === "বাজার খরচ") && "মেম্বারদের বাজার জমা ও হিসাব"}
                {(activeNav === "MarketSchedule" || activeNav === "বাজার সময়সূচি") && "মেসের মেম্বারদের বাজার ডিউটি রোস্টার ও ক্যালেন্ডার"}
                {(activeNav === "Utilities" || activeNav === "ইউটিলিটি ও বিল") && "ইউটিলিটি ও শেয়ার্ড বিল বিলি"}
                {(activeNav === "Members" || activeNav === "মেম্বারবৃন্দ") && "মেম্বারশিপ, বাসা ভাড়া ও কাস্টম চার্জ"}
                {(activeNav === "Settings" || activeNav === "সেটিংস") && "মেস ও প্রোফাইল সেটিংস"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {(activeNav === "Overview" || activeNav === "ওভারভিউ") && "মেসের সামগ্রিক পরিস্থিতি, আজকের বাজার ও মিল এবং মাসিক ফাইনাল সেটেলমেন্টের সংক্ষিপ্ত রূপ।"}
                {(activeNav === "Meals" || activeNav === "মিল ক্যালেন্ডার") && "প্রতিদিনের দুপুর ও রাতের মিল আলাদা করে দেখুন এবং সদস্যভিত্তিক মাসিক মোট মিল নিশ্চিত করুন।"}
                {(activeNav === "Expenses" || activeNav === "বাজার খরচ") && "অ্যাডভান্স জমা, দৈনিক বাজার এবং বড় বাজার শেয়ারের পরিমাণ এন্ট্রি করুন।"}
                {(activeNav === "MarketSchedule" || activeNav === "বাজার সময়সূচি") && "কার কোন তারিখে বাজার ডিউটি তা ক্যালেন্ডারে দেখুন, আজকের স্পটলাইট জানুন এবং সহজে ডেট-রেঞ্জ সেট করুন।"}
                {(activeNav === "Utilities" || activeNav === "ইউটিলিটি ও বিল") && "বিদ্যুৎ, গ্যাস, ইন্টারনেট, পানি ও খালা বিল যুক্ত করে সকল মেম্বারের মাঝে বণ্টন করুন।"}
                {(activeNav === "Members" || activeNav === "মেম্বারবৃন্দ") && "মেসের মেম্বারদের নাম, ঘর/বাসা ভাড়া এবং বিশেষ ইউটিলিটি চার্জ কনফিগার করুন।"}
                {(activeNav === "Settings" || activeNav === "সেটিংস") && "আপনার মেসের নাম, ম্যানেজারের নাম এবং অ্যাকাউন্ট সিকিউরিটি পরিবর্তন করুন।"}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <span className="size-2 rounded-full bg-chart-2" />
              {members.length} জন সক্রিয় মেম্বার
            </div>
          </div>

          {members.length === 0 && (
            <section className="mb-8 rounded-3xl border border-dashed border-primary/50 bg-primary/6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">প্রথম সেটআপ</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">মেসফ্লোতে আপনাকে স্বাগতম</h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    মেম্বারদের নাম যুক্ত করে এবং বিল ও মিল এন্ট্রি দিয়ে শুরু করুন।
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={addMember} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">নতুন মেম্বার যুক্ত করুন</button>
                  <button onClick={addUtility} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">ইউটিলিটি বিল লিখুন</button>
                </div>
              </div>
            </section>
          )}

          {/* VIEW 1: OVERVIEW PAGE */}
          {(activeNav === "Overview" || activeNav === "ওভারভিউ") && (
            <div className="space-y-8">
              <section className="space-y-3" aria-label="আজকের বাজার ও মিল">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">আজকের অবস্থা · বাংলাদেশ সময়</p>
                    <h3 className="mt-1 text-xl font-semibold">বাজার ডিউটি ও মিল</h3>
                  </div>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">{todayDate}</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="আজকের বাজার" value={todayOverviewFailed ? 'তথ্য পাওয়া যায়নি' : currentTodayOverview ? currentTodayOverview.dutyNames.join(', ') || 'ডিউটি নেই' : 'লোড হচ্ছে…'} note={currentTodayOverview?.dutyNames.length ? 'আজ বাজারের দায়িত্বে' : 'বাজার সময়সূচি থেকে ডিউটি নির্ধারণ করুন'} icon={CalendarDays} />
                  <MetricCard label="আজ দুপুরের মিল" value={todayOverviewFailed ? '—' : currentTodayOverview ? currentTodayOverview.lunch.toLocaleString('bn-BD') : '…'} note="দুপুরের মিল সংখ্যা" icon={Utensils} />
                  <MetricCard label="আজ রাতের মিল" value={todayOverviewFailed ? '—' : currentTodayOverview ? currentTodayOverview.dinner.toLocaleString('bn-BD') : '…'} note="রাতের মিল সংখ্যা" icon={Utensils} />
                  <MetricCard label="আজ মোট মিল" value={todayOverviewFailed ? '—' : currentTodayOverview ? currentTodayOverview.total.toLocaleString('bn-BD') : '…'} note={currentTodayOverview?.unassigned ? `পুরোনো ${currentTodayOverview.unassigned} মিলের বেলা নির্ধারণ বাকি` : 'দুপুর ও রাতের যোগফল'} icon={BarChart3} />
                </div>
              </section>

              {/* High level Metric Cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="মোট মিল"
                  value={calculated.totalMeals.toLocaleString("bn-BD")}
                  note={`${days.length} দিনের এন্ট্রি`}
                  icon={Utensils}
                />
                <MetricCard
                  label="বড় বাজার মোট জমা"
                  value={money(calculated.totalBigMarketCollected)}
                  note="ম্যানেজারের নিকট মেম্বারদের জমা"
                  icon={WalletCards}
                />
                <MetricCard
                  label="প্রকৃত বড় বাজার খরচ"
                  value={money(calculated.actualBigMarketSpent)}
                  note={calculated.isCustomActualSet ? "ম্যানেজারের কেনাকাটা খরচ" : "বড় বাজার জমার সমান"}
                  icon={Receipt}
                />
                <MetricCard
                  label="ম্যানেজার ক্যাশ ইন হ্যান্ড"
                  value={money(calculated.managerBigMarketCashInHand)}
                  note={calculated.managerBigMarketCashInHand >= 0 ? "বড় বাজারের অবশিষ্টাংশ ক্যাশ" : "ক্যাশ ঘাটতি"}
                  icon={WalletCards}
                />
                <MetricCard
                  label="কার্যকর মিল রেট"
                  value={money(calculated.mealRate)}
                  note="প্রকৃত বাজার ÷ মোট মিল"
                  icon={BarChart3}
                />
              </section>

              {/* Manager Cash & Audit Transparency Card */}
              <div className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-background p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shrink-0">
                      <WalletCards size={24} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          ম্যানেজারের বড় বাজার ক্যাশ ও মিল সমন্বয় (Big Market Cash Audit)
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          calculated.managerBigMarketCashInHand >= 0
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}>
                          {calculated.managerBigMarketCashInHand >= 0 ? "বড় বাজার ক্যাশ উদ্বৃত্ত ✅" : "ক্যাশ ঘাটতি ⚠️"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mt-1">
                        বড় বাজার সংগৃহীত জমা, প্রকৃত কেনাকাটা ও হাতে থাকা ক্যাশ
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground max-w-2xl">
                        ম্যানেজার মেম্বারদের থেকে বড় বাজার বাবদ মোট {money(calculated.totalBigMarketCollected)} টাকা জমা পেয়েছেন। প্রকৃত কেনাকাটায় {money(calculated.actualBigMarketSpent)} টাকা খরচ হওয়ায় বাকি {money(calculated.managerBigMarketCashInHand)} টাকা ম্যানেজারের কাছে গচ্ছিত আছে। এই বেঁচে যাওয়া টাকা মিল রেট কমাবে এবং ফাইনাল সেটেলমেন্টে স্বয়ংক্রিয়ভাবে ফেরত মিলবে!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNav("বাজার খরচ")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 shrink-0"
                  >
                    <Receipt size={16} />
                    <span>প্রকৃত কেনাকাটা এডিট করুন →</span>
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground block">১. বড় বাজার মোট সংগৃহীত জমা</span>
                    <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                      {money(calculated.totalBigMarketCollected)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block mt-1">মেম্বারদের দেওয়া বড় বাজার শেয়ারের যোগফল</span>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                    <span className="text-xs font-semibold text-muted-foreground block">২. প্রকৃত বড় বাজার কেনাকাটা খরচ</span>
                    <strong className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-1">
                      {money(calculated.actualBigMarketSpent)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      {calculated.isCustomActualSet ? "ম্যানেজারের দেওয়া প্রকৃত কেনাকাটা" : "বড় বাজার জমার সমান ধরা হয়েছে"}
                    </span>
                  </div>

                  <div className={`rounded-2xl border p-4 shadow-2xs ${
                    calculated.managerBigMarketCashInHand >= 0
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}>
                    <span className="text-xs font-semibold text-muted-foreground block">৩. ম্যানেজারের কাছে ক্যাশ ইন হ্যান্ড</span>
                    <strong className={`text-xl font-black block mt-1 ${
                      calculated.managerBigMarketCashInHand >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {calculated.managerBigMarketCashInHand >= 0
                        ? `+ ${money(calculated.managerBigMarketCashInHand)}`
                        : `- ${money(Math.abs(calculated.managerBigMarketCashInHand))}`}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      {calculated.managerBigMarketCashInHand >= 0
                        ? "বড় বাজার করার পর ম্যানেজারের হাতে গচ্ছিত নগদ ক্যাশ"
                        : "ম্যানেজার নিজের পকেট থেকে অতিরিক্ত খরচ করেছেন"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Smart Meal Rate & Budget Optimizer */}
              {/* <MealRateBudgetOptimizer
                totalMeals={calculated.totalMeals}
                currentGrocery={calculated.grocerySpend}
                currentMealRate={calculated.mealRate}
                daysCount={days.length}
                selectedMonth={selectedMonth}
              /> */}

              {/* Quick Navigation Cards Grid */}
              <section className="mt-8">
                <div className="mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    মেস ডাটা এন্ট্রি শর্টকাট (Quick Section Access)
                  </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    onClick={() => setActiveNav("মিল ক্যালেন্ডার")}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <Utensils size={20} />
                        </span>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition" />
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground">মিল ক্যালেন্ডার</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{calculated.totalMeals} টি মাসিক মিল এন্ট্রি করা হয়েছে</p>
                    </div>
                    <span className="mt-4 text-xs font-bold text-primary">ক্যালেন্ডার খুলুন →</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("বাজার খরচ")}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <Receipt size={20} />
                        </span>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition" />
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground">মেম্বারদের বাজার জমা</h4>
                      <p className="mt-1 text-xs text-muted-foreground">মোট জমা: {money(calculated.grocerySpend)}</p>
                    </div>
                    <span className="mt-4 text-xs font-bold text-primary">বাজার এন্ট্রি করুন →</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("ইউটিলিটি ও বিল")}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <SlidersHorizontal size={20} />
                        </span>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition" />
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground">ইউটিলিটি ও বিল</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{utilities.length} টি ইউটিলিটি বিল ({money(calculated.utilityTotal)})</p>
                    </div>
                    <span className="mt-4 text-xs font-bold text-primary">বিল ম্যানেজ করুন →</span>
                  </button>

                  <button
                    onClick={() => setActiveNav("মেম্বারবৃন্দ")}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                          <Users size={20} />
                        </span>
                        <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition" />
                      </div>
                      <h4 className="mt-4 font-semibold text-foreground">মেম্বার ও বাসা ভাড়া</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{members.length} জন সক্রিয় মেম্বার</p>
                    </div>
                    <span className="mt-4 text-xs font-bold text-primary">মেম্বার সেটআপ →</span>
                  </button>
                </div>
              </section>

              {/* Grand Monthly Settlement Summary Section */}
              <section className="mt-8">
                <SectionTitle
                  icon={CircleDollarSign}
                  eyebrow="সর্বমোট চূড়ান্ত হিসাব"
                  title="গ্র্যান্ড মান্থলি সেটেলমেন্ট সামারি"
                  action={
                    <button
                      onClick={exportXlsx}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <ArrowDownToLine size={16} />
                      রিপোর্ট ডাউনলোড
                    </button>
                  }
                />
                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:min-w-[1150px]">
                      <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">মেম্বার</th>
                          <th className="px-4 py-3 text-right font-medium">মোট মিল</th>
                          <th className="px-4 py-3 text-right font-medium">মিল রেট</th>
                          <th className="px-4 py-3 text-right font-medium">বাজার/মিল জমা</th>
                          <th className="px-4 py-3 text-right font-medium">মোট মিল খরচ</th>
                          <th className="px-4 py-3 text-right font-medium">মিল নিট স্থিতি</th>
                          <th className="px-4 py-3 text-right font-medium">ইউটিলিটি শেয়ার</th>
                          <th className="px-4 py-3 text-right font-medium">বাসা ভাড়া</th>
                          <th className="px-4 py-3 text-right font-medium">সর্বমোট চূড়ান্ত পাওনা/দেওয়া</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calculated.grandSettlements.map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground ${row.color}`}>{row.initials}</span>
                                <span className="font-semibold">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{row.meals} টি</td>
                            <td className="px-4 py-3 text-right font-medium">{money(row.mealRate)}</td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{money(row.groceries)}</td>
                            <td className="px-4 py-3 text-right font-medium text-rose-600 dark:text-rose-400">{money(row.mealCost)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.mealNet > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : row.mealNet < 0 ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" : "bg-muted text-muted-foreground"}`}>
                                {row.mealNet > 0 ? `পাবেন +${money(row.mealNet)}` : row.mealNet < 0 ? `দিবেন -${money(Math.abs(row.mealNet))}` : "হিসাব সমান"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{money(row.utilityShare)}</td>
                            <td className="px-4 py-3 text-right font-medium">{money(row.houseRent)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.grandTotalPayable > 0 ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" : row.grandTotalPayable < 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                                {row.grandTotalPayable > 0 ? `মোট দিবেন ${money(row.grandTotalPayable)}` : row.grandTotalPayable < 0 ? `মোট পাবেন ${money(Math.abs(row.grandTotalPayable))}` : "হিসাব সমান"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-border bg-muted/60 font-semibold">
                        <tr>
                          <td className="px-4 py-3.5 font-bold text-foreground">সর্বমোট সামারি</td>
                          <td className="px-4 py-3.5 text-right font-bold text-foreground">{calculated.totalMeals} টি</td>
                          <td className="px-4 py-3.5 text-right font-bold text-muted-foreground">—</td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.groceries, 0))}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.mealCost, 0))}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-muted-foreground">—</td>
                          <td className="px-4 py-3.5 text-right font-bold text-foreground">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.utilityShare, 0))}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-foreground">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.houseRent, 0))}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-primary text-base">{money(calculated.grandSettlements.reduce((sum, r) => sum + (r.grandTotalPayable > 0 ? r.grandTotalPayable : 0), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/40 px-5 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">সর্বমোট আদায়যোগ্য টাকা (Payable Sum)</p>
                      <p className="text-xl font-bold text-primary">
                        {money(calculated.grandSettlements.reduce((sum, r) => sum + (r.grandTotalPayable > 0 ? r.grandTotalPayable : 0), 0))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                      <div>
                        <span>মোট বাজার জমা: </span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.groceries, 0))}</strong>
                      </div>
                      <div>
                        <span>মোট মিল খরচ: </span>
                        <strong className="text-rose-600 dark:text-rose-400 font-bold">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.mealCost, 0))}</strong>
                      </div>
                      <div>
                        <span>সর্বমোট বাসা ভাড়া: </span>
                        <strong className="text-foreground font-bold">{money(calculated.grandSettlements.reduce((sum, r) => sum + r.houseRent, 0))}</strong>
                      </div>
                      <div>
                        <span>মেস থেকে মোট নেট আদায়যোগ্য: </span>
                        <strong className="text-emerald-500 font-bold">{money(calculated.grandSettlements.reduce((sum, r) => sum + (r.grandTotalPayable > 0 ? r.grandTotalPayable : 0), 0))}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 2: MEAL CALENDAR PAGE */}
          {(activeNav === "Meals" || activeNav === "মিল ক্যালেন্ডার") && (
            <section className="space-y-6">
              <SectionTitle
                icon={Utensils}
                eyebrow="দৈনিক রেজিস্টার"
                title="মিল ক্যালেন্ডার"
                action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMonth(changeMonthKey(selectedMonth, -1))}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
                      {monthKeyToLabel(selectedMonth)}
                    </span>
                    <button
                      onClick={() => setSelectedMonth(changeMonthKey(selectedMonth, 1))}
                      className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                }
              />
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">আগাম মিল পরিকল্পনা</h3>
                    <p className="text-xs text-muted-foreground">স্বয়ংক্রিয়ভাবে প্রতিদিন দুপুরে ১টি এবং রাতে ১টি মিল। পরিকল্পনায় দুই বেলাই ০ রাখলে মিল বন্ধ।</p>
                  </div>
                  <button type="button" onClick={() => openMealSchedule()} disabled={members.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    <Plus size={16} /> পরিকল্পনা যোগ করুন
                  </button>
                </div>
                {scheduleError && <p role="alert" className="text-sm text-destructive">{scheduleError}</p>}
                {mealSchedules.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mealSchedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                        <span className="font-semibold">{members.find((member) => member.id === schedule.memberId)?.name ?? 'মেম্বার'}</span>
                        <span>{schedule.startDate} → {schedule.endDate}</span>
                        <span className="font-bold text-primary">দুপুর {schedule.lunchCount ?? (schedule.count === 2 ? 1 : schedule.count === 0 ? 0 : '?')} · রাত {schedule.dinnerCount ?? (schedule.count === 2 ? 1 : schedule.count === 0 ? 0 : '?')}</span>
                        {schedule.count === 0 && <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">দুই বেলা বন্ধ</span>}
                        {schedule.lunchCount == null && schedule.dinnerCount == null && schedule.count !== 0 && schedule.count !== 2 && <span className="text-amber-700 dark:text-amber-300">পুরোনো {schedule.count} মিলের বেলা নির্ধারণ বাকি</span>}
                        <button type="button" onClick={() => openMealSchedule(schedule)} className="font-semibold text-primary hover:underline">এডিট</button>
                        <button type="button" onClick={() => void removeMealSchedule(schedule)} aria-label="পরিকল্পনা বাতিল" className="text-destructive hover:opacity-70"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <span>দুপুর ও রাতের সংখ্যা লিখুন। ঘর থেকে বের হলে পরিবর্তন সংরক্ষিত হবে।</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-200"><span className="size-2 rounded-full bg-emerald-500" /> সবুজ ঘরে মিল আছে</span>
                </div>
                <div className="divide-y divide-border xl:hidden">
                  {days.map((day, index) => (
                    <div key={`${day.date}-${day.label}`} className="space-y-2 p-3">
                      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                        <span className="font-bold">{day.date} <span className="text-xs font-normal text-muted-foreground">{day.label}</span></span>
                        <span className="text-sm font-bold text-primary">মোট {day.total} মিল</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {members.map((member) => {
                          const count = day.counts[member.id] ?? 0;
                          const unassigned = day.unassignedCounts[member.id] ?? 0;
                          return (
                            <div key={member.id} className={`min-w-0 rounded-xl border p-2 ${count > 0 ? 'border-emerald-500/50 bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/20' : 'border-border bg-muted/20'}`}>
                              <div className="mb-1 flex items-center justify-between gap-1">
                                <span className="min-w-0 truncate text-xs font-semibold" title={member.name}>{member.name}</span>
                                {count > 0 && <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="মিল আছে" />}
                              </div>
                              <MealCountEditor memberName={member.name} date={`${selectedMonth}-${day.date}`} lunch={day.lunchCounts[member.id] ?? 0} dinner={day.dinnerCounts[member.id] ?? 0} source={day.sources[member.id]} onLunchChange={(value) => updateMeal(index, member.id, 'lunch', value)} onDinnerChange={(value) => updateMeal(index, member.id, 'dinner', value)} onBlur={() => saveMeal(index, member.id)} />
                              <p className={`mt-1 text-center text-[11px] font-semibold ${count > 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-muted-foreground'}`}>{count > 0 ? `মোট ${count} মিল` : 'মিল নেই'}</p>
                              {unassigned > 0 && <p className="mt-1 text-center text-[10px] text-orange-700 dark:text-orange-300">পুরোনো {unassigned} · বেলা নির্ধারণ বাকি</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 bg-muted/40 p-3">
                    <div className="flex items-center justify-between font-bold"><span>মাসিক মোট মিল</span><span className="text-primary">{calculated.totalMeals}</span></div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {members.map((member) => {
                        const lunch = days.reduce((sum, day) => sum + (day.lunchCounts[member.id] ?? 0), 0);
                        const dinner = days.reduce((sum, day) => sum + (day.dinnerCounts[member.id] ?? 0), 0);
                        const unassigned = days.reduce((sum, day) => sum + (day.unassignedCounts[member.id] ?? 0), 0);
                        return <div key={member.id} className="rounded-lg border border-border bg-card p-2 text-xs">
                          <span className="block truncate font-semibold">{member.name}</span>
                          <span className="font-bold text-primary">{lunch + dinner + unassigned} মিল</span>
                          <span className="block text-muted-foreground">দুপুর {lunch} · রাত {dinner}</span>
                          {unassigned > 0 && <span className="block text-orange-700 dark:text-orange-300">অনির্ধারিত {unassigned}</span>}
                        </div>;
                      })}
                    </div>
                  </div>
                </div>
                <div className="relative z-0 hidden max-h-[70vh] overflow-auto xl:block">
                  <table className="w-full border-separate border-spacing-0 text-xs">
                    <thead className="bg-muted text-left text-xs font-semibold text-foreground">
                      <tr>
                        <th scope="col" className="sticky left-0 top-0 z-30 w-16 border-b border-r border-border bg-muted px-2 py-2">তারিখ</th>
                        {members.map((member) => (
                          <th scope="col" key={member.id} className="sticky top-0 z-20 w-28 min-w-28 max-w-28 border-b border-r border-border bg-muted px-1 py-2 text-center"><span className="block truncate" title={member.name}>{member.name}</span></th>
                        ))}
                        <th scope="col" className="sticky top-0 z-20 w-20 border-b border-border bg-muted px-2 py-2 text-right">দিনের মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day, index) => (
                        <tr key={`${day.date}-${day.label}`} className="group hover:bg-muted/25">
                          <th scope="row" className="sticky left-0 z-10 border-b border-r border-border bg-card px-2 py-2 text-left group-hover:bg-muted">
                            <span className="block font-bold tabular-nums">{day.date}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">{day.label}</span>
                          </th>
                          {members.map((member) => {
                            const lunch = day.lunchCounts[member.id] ?? 0;
                            const dinner = day.dinnerCounts[member.id] ?? 0;
                            const unassigned = day.unassignedCounts[member.id] ?? 0;
                            const count = day.counts[member.id] ?? 0;
                            return (
                              <td key={member.id} className={`border-b border-r px-1 py-1.5 align-middle ${count > 0 ? 'border-emerald-500/30 bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/25' : 'border-border'}`}>
                                <MealCountEditor memberName={member.name} date={`${selectedMonth}-${day.date}`} lunch={lunch} dinner={dinner} source={day.sources[member.id]} onLunchChange={(value) => updateMeal(index, member.id, 'lunch', value)} onDinnerChange={(value) => updateMeal(index, member.id, 'dinner', value)} onBlur={() => saveMeal(index, member.id)} />
                                <div className={`mt-0.5 text-center text-[10px] font-semibold ${count > 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-muted-foreground'}`}>{count > 0 ? `● ${count} মিল` : 'মিল নেই'}</div>
                                {unassigned > 0 && <div className="mt-0.5 text-center text-[10px] text-orange-700 dark:text-orange-300" title="পুরোনো এন্ট্রিতে কোন বেলায় মিল ছিল জানা নেই। নতুন সংখ্যা লিখে ঠিক করুন।">পুরোনো {unassigned} অনির্ধারিত</div>}
                              </td>
                            );
                          })}
                          <td className="border-b border-border px-2 py-2 text-right align-middle font-bold tabular-nums text-primary">{day.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/70 font-semibold">
                      <tr>
                        <th scope="row" className="sticky left-0 z-10 border-r border-border bg-muted px-2 py-2 text-left">মাসিক মোট</th>
                        {members.map((member) => {
                          const lunch = days.reduce((sum, day) => sum + (day.lunchCounts[member.id] ?? 0), 0);
                          const dinner = days.reduce((sum, day) => sum + (day.dinnerCounts[member.id] ?? 0), 0);
                          const unassigned = days.reduce((sum, day) => sum + (day.unassignedCounts[member.id] ?? 0), 0);
                          return <td key={member.id} className="border-r border-border px-1 py-2 text-center">
                            <span className="block font-bold text-primary">{lunch + dinner + unassigned} মিল</span>
                            <span className="block text-[11px] text-muted-foreground">দুপুর {lunch} · রাত {dinner}</span>
                            {unassigned > 0 && <span className="block text-[11px] text-orange-700 dark:text-orange-300">অনির্ধারিত {unassigned}</span>}
                          </td>;
                        })}
                        <td className="px-2 py-2 text-right text-sm font-bold text-primary">{calculated.totalMeals}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">পুরোনো অনির্ধারিত মিল মোট হিসাবে আছে। দুপুর বা রাতের ঘরে সংখ্যা লিখলে ওই দিনের পুরোনো এন্ট্রি নতুন দুই বেলার সংখ্যা দিয়ে বদলাবে।</div>
              </div>
            </section>
          )}

          {/* VIEW 3: EXPENSES PAGE */}
          {(activeNav === "Expenses" || activeNav === "বাজার খরচ") && (
            <div className="space-y-8">
              {/* Section 1: Member Deposits & Advance */}
              <section className="space-y-4">
                <SectionTitle
                  icon={Receipt}
                  eyebrow="মেম্বারদের জমা"
                  title="মেম্বারদের বাজার জমা ও ডিপোজিট রেজিস্টার"
                  action={
                    <span className="text-xs text-muted-foreground">
                      মেম্বারদের দেওয়া জমা ও বাজার অবদান এন্ট্রি করুন
                    </span>
                  }
                />
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:min-w-[680px]">
                      <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">মেম্বার</th>
                          {expenseCategories.map((category) => (
                            <th key={category} className="px-4 py-3 text-right font-medium">{category}</th>
                          ))}
                          <th className="px-4 py-3 text-right font-medium">মোট জমা (E)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {members.map((member) => {
                          const memberExpenses = expenses[member.id] ?? {};
                          const totalGiven = expenseCategories.reduce((sum, category) => sum + (Number(memberExpenses[category]) || 0), 0);
                          return (
                            <tr key={member.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-semibold">
                                <div className="flex items-center gap-3">
                                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground ${member.color}`}>{member.initials}</span>
                                  <span>{member.name}</span>
                                </div>
                              </td>
                              {expenseCategories.map((category) => (
                                <td key={category} className="px-4 py-3 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    value={memberExpenses[category] ?? 0}
                                    onChange={(event) => updateExpense(member.id, category, Number(event.target.value) || 0)}
                                    className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                                  />
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{money(totalGiven)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-border bg-muted/60 font-semibold">
                        <tr>
                          <td className="px-4 py-3 font-bold text-foreground">মেসের মোট সংগৃহীত জমা</td>
                          <td colSpan={expenseCategories.length} className="px-4 py-3 text-right text-xs text-muted-foreground">
                            (সকল মেম্বারের দেওয়া নগদ জমার যোগফল)
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base">
                            {money(calculated.totalDepositCollected)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* Section 2: Actual Big Market Expense & Manager Cash in Hand */}
              <section className="space-y-4">
                <SectionTitle
                  icon={WalletCards}
                  eyebrow="প্রকৃত কেনাকাটা ও ক্যাশ"
                  title="প্রকৃত বড় বাজার খরচ ও ম্যানেজারের ক্যাশ ইন হ্যান্ড"
                />

                <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          ম্যানেজারের বড় বাজার ক্যাশ হিসেব
                        </span>
                        {calculated.isCustomActualSet && (
                          <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold border border-primary/20">
                            প্রকৃত কেনাকাটা সেট করা আছে
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mt-1">
                        প্রকৃত বড় বাজার খরচ বনাম মেম্বারদের বড় বাজার জমা
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                        যেমন: মেম্বাররা বড় বাজার করার জন্য মোট <strong>{money(calculated.totalBigMarketCollected)}</strong> ম্যানেজারের কাছে দিল, কিন্তু পাইকারি বড় বাজার করতে <strong>{money(calculated.actualBigMarketSpent)}</strong> খরচ হলো — বাকি <strong>{money(calculated.managerBigMarketCashInHand)}</strong> টাকা ম্যানেজারের হাতে জমা ক্যাশ থাকবে।
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => updateActualGrocery(null)}
                        className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-accent flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} />
                        <span>বড় বাজার জমার সমান করুন (রিসেট)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Control Input */}
                    <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                        প্রকৃত বড় বাজার কেনাকাটা খরচ এন্ট্রি (টাকা):
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-base">৳</span>
                        <input
                          type="number"
                          min="0"
                          placeholder={`ডিফল্ট: ${calculated.totalBigMarketCollected}`}
                          value={customActualGrocery ?? ""}
                          onChange={(e) => updateActualGrocery(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-3 text-lg font-black text-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        💡 বড় বাজার (চাল, ডাল, তেল ইত্যাদি) কেনার পর মেমো অনুযায়ী আসল কেনাকাটা খরচ এখানে লিখুন। এটি দিলে মিল রেট <strong>প্রকৃত বড় বাজার খরচের উপর</strong> হিসেব হবে এবং বাঁচা টাকা ম্যানেজারের ক্যাশে হিসাব থাকবে।
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs text-muted-foreground font-medium self-center mr-1">দ্রুত প্রিসেট:</span>
                        {[500, 1000, 2000, 4500, 5000].map((presetAmt) => (
                          <button
                            key={presetAmt}
                            onClick={() => updateActualGrocery(presetAmt)}
                            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold hover:bg-accent transition"
                          >
                            ৳ {presetAmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Financial & Cash Impact Card */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          লাইভ বড় বাজার ক্যাশ ও মিল রেট পূর্বরূপ
                        </span>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl border border-border bg-muted/40 p-3">
                            <span className="text-muted-foreground block text-[11px]">বড় বাজারে মেম্বারদের জমা:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold block mt-0.5">
                              {money(calculated.totalBigMarketCollected)}
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-3">
                            <span className="text-muted-foreground block text-[11px]">প্রকৃত বড় বাজার খরচ:</span>
                            <strong className="text-rose-600 dark:text-rose-400 text-sm font-bold block mt-0.5">
                              {money(calculated.actualBigMarketSpent)}
                            </strong>
                          </div>
                        </div>

                        <div className={`rounded-xl border p-4 ${
                          calculated.managerBigMarketCashInHand >= 0
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {calculated.managerBigMarketCashInHand >= 0 ? "ম্যানেজারের হাতে বড় বাজারের ক্যাশ" : "ক্যাশ ঘাটতি"}
                            </span>
                            <WalletCards size={18} />
                          </div>
                          <div className="text-2xl font-black mt-1">
                            {calculated.managerBigMarketCashInHand >= 0
                              ? `+ ${money(calculated.managerBigMarketCashInHand)}`
                              : `- ${money(Math.abs(calculated.managerBigMarketCashInHand))}`}
                          </div>
                          <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
                            {calculated.managerBigMarketCashInHand >= 0
                              ? "মেম্বারদের থেকে বড় বাজার জমা নেওয়ার পর কেনাকাটার শেষে এই টাকাটি ম্যানেজারের হাতে নগদ আছে।"
                              : "ম্যানেজার বড় বাজার করার সময় সংগৃহীত জমার চেয়ে বেশি খরচ করেছেন।"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2.5 text-xs">
                        <span className="text-muted-foreground font-medium">নতুন কার্যকর মিল রেট:</span>
                        <strong className="text-primary text-sm font-bold">
                          {money(calculated.mealRate)} / মিল
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 3.5: MARKET DUTY SCHEDULE & CALENDAR */}
          {(activeNav === "MarketSchedule" || activeNav === "বাজার সময়সূচি") && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* 1. Today's Market Spotlight Card */}
              {(() => {
                const now = new Date();
                const currentMonthStr = getCurrentMonthKey();
                const isCurrentMonthActive = selectedMonth === currentMonthStr;
                const todayDayNum = isCurrentMonthActive ? now.getDate() : -1;
                
                const todayDuty = todayDayNum > 0 
                  ? marketDuties.find(d => d.startDay <= todayDayNum && todayDayNum <= d.endDay)
                  : null;

                return (
                  <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-md md:p-8">
                    <div className="absolute -top-12 -right-12 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex size-3">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-primary">
                            আজকের বাজার স্পটলাইট (Spotlight Card)
                          </span>
                        </div>

                        {todayDuty ? (
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex flex-wrap items-center gap-3">
                              <span>আজকের বাজার ডিউটিতে আছেন:</span>
                              <span className="inline-flex items-center gap-2 rounded-2xl bg-primary px-3.5 py-1 text-xl font-bold text-primary-foreground shadow-sm">
                                <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-xs font-black">
                                  {todayDuty.memberInitials}
                                </span>
                                {todayDuty.memberName}
                              </span>
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground">
                              ডিউটি সময়কাল: <strong className="text-foreground">{todayDuty.startDay} থেকে {todayDuty.endDay} তারিখ</strong> (আজসহ আর {todayDuty.endDay - todayDayNum + 1} দিন বাকি)
                            </p>
                            {todayDuty.note && (
                              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-border bg-background/80 px-4 py-3 text-xs font-medium text-foreground">
                                <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">বাজার নোট: </span>
                                  <span>{todayDuty.note}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-2">
                              <span>আজকে নির্দিষ্ট কারো বাজার ডিউটি নেই</span>
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {isCurrentMonthActive 
                                ? `আজকে (${todayDayNum} তারিখ) মেসের বাজার করতে চাইলে দ্রুত অ্যাসাইন করে নিন।`
                                : `নিচের ক্যালেন্ডার থেকে যেকোনো তারিখে ক্লিক করে বাজার ডিউটি নির্ধারণ করুন।`}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {todayDuty && (
                          <button
                            onClick={() => handleOpenEditDuty(todayDuty)}
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-accent"
                          >
                            <Settings2 size={16} />
                            <span>ডিউটি পরিবর্তন করুন</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenAddDuty(todayDayNum > 0 ? todayDayNum : 1)}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition hover:bg-primary/90"
                        >
                          <Plus size={16} />
                          <span>+ নতুন ডিউটি নির্ধারণ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. Interactive Monthly Calendar View */}
              {(() => {
                const [year, month] = selectedMonth.split('-').map(Number);
                const totalDaysInMonth = new Date(year, month, 0).getDate();
                const startingWeekday = new Date(year, month - 1, 1).getDay();
                const weekdayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
                const now = new Date();
                const isCurrentMonthActive = selectedMonth === getCurrentMonthKey();
                const todayDayNum = isCurrentMonthActive ? now.getDate() : -1;

                return (
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <SectionTitle
                        icon={CalendarDays}
                        eyebrow="ইন্টারেক্টিভ গ্রিড ভিউ"
                        title={`${monthKeyToLabel(selectedMonth)} - বাজারের সময়সূচি ক্যালেন্ডার`}
                      />
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-medium">
                          মোট শিডিউল: <strong className="text-foreground font-bold">{marketDuties.length} টি</strong>
                        </span>
                        <button
                          onClick={() => handleOpenAddDuty(1)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
                        >
                          <Plus size={14} />
                          <span>ডিউটি যোগ করুন</span>
                        </button>
                      </div>
                    </div>

                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-3 mb-2">
                      {weekdayNames.map((dayName, idx) => (
                        <div key={dayName} className={idx === 5 || idx === 6 ? "text-amber-500/80" : ""}>
                          {dayName}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                      {Array.from({ length: startingWeekday }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="min-h-24 rounded-2xl border border-transparent bg-muted/20 opacity-40" />
                      ))}

                      {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const isToday = dayNum === todayDayNum;

                        const dayDuties = marketDuties.filter(
                          d => d.startDay <= dayNum && dayNum <= d.endDay
                        );

                        return (
                          <div
                            key={`day-${dayNum}`}
                            onClick={() => {
                              if (dayDuties.length > 0) {
                                handleOpenEditDuty(dayDuties[0]);
                              } else {
                                handleOpenAddDuty(dayNum);
                              }
                            }}
                            className={`group relative flex min-h-24 flex-col justify-between rounded-2xl border p-2 transition cursor-pointer hover:border-primary hover:shadow-md ${
                              isToday
                                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                                : dayDuties.length > 0
                                ? "border-primary/20 bg-card"
                                : "border-border/60 bg-card/60 hover:bg-card"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-extrabold ${isToday ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm" : "text-foreground"}`}>
                                {dayNum}
                              </span>
                              {isToday && (
                                <span className="text-[10px] font-bold text-primary uppercase">আজ</span>
                              )}
                            </div>

                            <div className="mt-1 space-y-1.5">
                              {dayDuties.map((duty, dIdx) => {
                                const isStart = dayNum === duty.startDay;
                                const isEnd = dayNum === duty.endDay;
                                const memberIndex = members.findIndex(m => m.id === duty.memberId);
                                const style = getMemberStyle(memberIndex >= 0 ? memberIndex : dIdx);

                                return (
                                  <div
                                    key={duty.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditDuty(duty);
                                    }}
                                    title={`${duty.memberName} (${duty.startDay}-${duty.endDay} তারিখ)${duty.note ? ': ' + duty.note : ''}`}
                                    className={`flex items-center justify-between rounded-lg border px-1.5 py-1 text-[11px] font-bold transition hover:scale-[1.02] ${style.bg}`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0 truncate">
                                      <span className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${style.badge}`}>
                                        {duty.memberInitials}
                                      </span>
                                      <span className="truncate">{duty.memberName}</span>
                                    </div>
                                    <span className="text-[9px] opacity-75 shrink-0 ml-1">
                                      {isStart && isEnd ? "১ দিন" : isStart ? "শুরু" : isEnd ? "শেষ" : "ডিউটি"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {dayDuties.length === 0 && (
                              <div className="mt-auto text-right opacity-0 transition group-hover:opacity-100">
                                <span className="text-[10px] font-semibold text-muted-foreground hover:text-primary">
                                  + যোগ
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 3. Market Duty Roster Table & Summary List */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <SectionTitle
                  icon={Receipt}
                  eyebrow="ডিউটি রোস্টার তালিকা"
                  title="চলতি মাসের সকল বাজার ডিউটি"
                  action={
                    <button
                      onClick={() => handleOpenAddDuty(1)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus size={15} />
                      <span>নতুন ডিউটি এন্ট্রি</span>
                    </button>
                  }
                />

                {marketDuties.length === 0 ? (
                  <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
                    <CalendarDays size={40} className="text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-semibold text-foreground">এই মাসে এখনও কোনো বাজার ডিউটি সেট করা হয়নি</p>
                    <p className="mt-1 text-xs text-muted-foreground">উপরের кнопка এ চাপ দিয়ে মেম্বারদের বাজার রোস্টার তৈরি করুন</p>
                    <button
                      onClick={() => handleOpenAddDuty(1)}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Plus size={15} />
                      <span>প্রথম ডিউটি নির্ধারণ করুন</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-semibold">মেম্বার</th>
                            <th className="px-4 py-3 font-semibold">ডিউটি সময়কাল (তারিখ)</th>
                            <th className="px-4 py-3 text-center font-semibold">মোট দিন</th>
                            <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                            <th className="px-4 py-3 font-semibold">বাজার নির্দেশিকা / নোট</th>
                            <th className="px-4 py-3 text-right font-semibold">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {marketDuties.map((duty, idx) => {
                            const now = new Date();
                            const isCurrentMonth = selectedMonth === getCurrentMonthKey();
                            const today = isCurrentMonth ? now.getDate() : -1;
                            const isActive = today >= duty.startDay && today <= duty.endDay;
                            const isPast = today > duty.endDay;
                            const memberIndex = members.findIndex(m => m.id === duty.memberId);
                            const style = getMemberStyle(memberIndex >= 0 ? memberIndex : idx);

                            return (
                              <tr key={duty.id} className="hover:bg-muted/30 transition">
                                <td className="px-4 py-3 font-bold">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`flex size-8 items-center justify-center rounded-xl text-xs font-extrabold ${style.badge}`}>
                                      {duty.memberInitials}
                                    </span>
                                    <span className="text-foreground font-semibold">{duty.memberName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground">
                                    <CalendarDays size={14} className="text-primary" />
                                    <span>{duty.startDay} তারিখ থেকে {duty.endDay} তারিখ</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-bold">
                                  {duty.endDay - duty.startDay + 1} দিন
                                </td>
                                <td className="px-4 py-3">
                                  {isActive ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      চলতি ডিউটি
                                    </span>
                                  ) : isPast ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                      সম্পন্ন
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                      আসন্ন
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {duty.note || <span className="italic opacity-60">কোনো নোট নেই</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenEditDuty(duty)}
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                                      title="সম্পাদনা করুন"
                                    >
                                      <Settings2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => setDutyDeleteTarget(duty)}
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                                      title="মুছে ফেলুন"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: UTILITIES PAGE */}
          {(activeNav === "Utilities" || activeNav === "ইউটিলিটি ও বিল") && (
            <section className="space-y-6">
              <SectionTitle
                icon={SlidersHorizontal}
                eyebrow="শেয়ার্ড বিল"
                title="ইউটিলিটি ও শেয়ার্ড বিল"
                action={
                  <button
                    onClick={addUtility}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <Plus size={16} />
                    নতুন বিল যোগ করুন
                  </button>
                }
              />
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-col gap-4">
                  {utilities.map((utility) => (
                    <div
                      key={utility.id}
                      className="flex items-center justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <input
                          value={utility.name}
                          onChange={(event) => updateUtility(utility.id, event.target.value, utility.amount)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">বিলের বিবরণ / নাম</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm font-medium">টাকা</span>
                        <input
                          type="number"
                          value={utility.amount}
                          onChange={(event) => updateUtility(utility.id, utility.name, Number(event.target.value) || 0)}
                          className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring font-semibold"
                        />
                        <IconButton label={`${utility.name} বিল মুছে ফেলুন`} onClick={() => setDeleteTarget({ type: 'utility', id: utility.id, name: utility.name })}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                    <div className="flex items-center justify-between font-bold text-base">
                      <span>সর্বমোট ইউটিলিটি বিল</span>
                      <span className="text-primary">{money(calculated.utilityTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {members.length
                        ? calculated.customMemberCount > 0
                          ? `অবশিষ্ট বিল ${money(calculated.remainingUtilityBill)} মোট ${calculated.defaultMemberCount} জন মেম্বারের মাঝে ভাগ করা হয়েছে (${money(calculated.defaultUtilityShare)} প্রতিজন)`
                          : `সকল ইউটিলিটি বিল সমভাবে ${members.length} জন মেম্বারের মাঝে ভাগ করা হয়েছে (${money(calculated.defaultUtilityShare)} প্রতিজন)`
                        : 'ইউটিলিটি হিসাবের জন্য মেম্বার যুক্ত করুন।'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* VIEW 5: MEMBERS & RENT PAGE */}
          {(activeNav === "Members" || activeNav === "মেম্বারবৃন্দ") && (
            <div className="space-y-10">
              <section>
                <SectionTitle
                  icon={CircleDollarSign}
                  eyebrow="স্থায়ী খরচ"
                  title="বাসা ভাড়া ও ফিক্সড খরচ"
                  action={
                    <span className="text-xs text-muted-foreground">
                      মাসিক বাসা ভাড়া ও রুম ভাড়া
                    </span>
                  }
                />
                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <MetricCard
                      label="সর্বমোট বাসা ভাড়া"
                      value={money(calculated.totalApartmentRent)}
                      note={`${members.length} জন সক্রিয় মেম্বার`}
                      icon={CircleDollarSign}
                    />
                  </div>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm sm:min-w-[660px]">
                        <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">মেম্বার</th>
                            <th className="px-4 py-3 text-right font-medium">বাসা ভাড়া (টাকা)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {members.map((member) => (
                            <tr key={member.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-semibold">
                                <div className="flex items-center gap-3">
                                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground ${member.color}`}>{member.initials}</span>
                                  <span>{member.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={member.houseRent ?? 0}
                                  onChange={(event) => updateHouseRent(member.id, event.target.value)}
                                  className="w-36 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={Users}
                  eyebrow="মেম্বারশিপ"
                  title="মেম্বারবৃন্দ ও কাস্টম ইউটিলিটি"
                  action={
                    <button
                      onClick={addMember}
                      className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus size={16} />
                      নতুন মেম্বার যোগ করুন
                    </button>
                  }
                />
                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm sm:min-w-[680px]">
                      <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">মেম্বার</th>
                          <th className="px-4 py-3 font-medium">WhatsApp ফোন</th>
                          <th className="px-4 py-3 text-right font-medium">মোট মিল</th>
                          <th className="px-4 py-3 text-right font-medium">ডিফল্ট ইউটিলিটি</th>
                          <th className="px-4 py-3 text-right font-medium">কাস্টম ইউটিলিটি শেয়ার</th>
                          <th className="px-4 py-3 text-right font-medium">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {calculated.settlements.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-semibold">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(event) => updateMemberName(row.id, event.target.value)}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="017xxxxxxxx"
                                value={row.phone ?? ""}
                                onChange={(event) => updateMemberPhone(row.id, event.target.value)}
                                className="w-36 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">{row.meals}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{money(calculated.defaultUtilityShare)}</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                placeholder="ডিফল্ট"
                                value={overrides[row.id]?.utilities ?? ""}
                                onChange={(event) => updateOverride(row.id, event.target.value)}
                                className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => updateOverride(row.id, "")} className="text-xs font-medium text-muted-foreground hover:text-foreground">রিসেট</button>
                              {members.length > 1 && (
                                <button aria-label={`${row.name} মেম্বার মুছে ফেলুন`} onClick={() => setDeleteTarget({ type: 'member', id: row.id, name: row.name })} className="ml-3 text-muted-foreground hover:text-destructive">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 6: SETTINGS PAGE */}
          {(activeNav === "Settings" || activeNav === "সেটিংস") && (
            <section className="mx-auto max-w-2xl space-y-6">
              <SectionTitle
                icon={Settings2}
                eyebrow="প্রোফাইল সেটআপ"
                title="মেস ও ম্যানেজার সেটিংস"
              />
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-muted-foreground font-medium">মেসের নাম</span>
                    <strong className="text-foreground font-bold">{messProfile?.messName ?? 'আপনার মেস'}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-muted-foreground font-medium">ম্যানেজারের নাম</span>
                    <strong className="text-foreground font-bold">{messProfile?.managerName ?? 'ম্যানেজার'}</strong>
                  </div>
                  <div className="pt-2">
                    <a
                      href="/settings"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <Settings2 size={18} />
                      <span>সম্পূর্ণ সেটিংস পেজে যান (পাসওয়ার্ড ও মেস প্রোফাইল এডিট)</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground print:hidden">
            <span>
              মেসফ্লো আপনার মেসের সকল হিসাব রাখে ডিজিটাল ও স্বচ্ছ।{" "}
              <span className="text-primary">{syncStatus === "Saved to MongoDB" ? "ডাটাবেজে সংরক্ষিত" : syncStatus}</span>
            </span>
            <span>
              এইমাত্র আপডেট হয়েছে ·{" "}
              <button onClick={exportPdf} className="font-medium text-primary hover:underline">
                প্রিন্ট / পিডিএফ কপি
              </button>
            </span>
          </footer>
        </div>

      {/* 1. Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5 text-primary">
                <Users size={22} />
                <h3 className="text-lg font-bold text-foreground">নতুন মেম্বার যুক্ত করুন</h3>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  মেম্বারের নাম <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: শাকিল আহমেদ"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  হোয়াটসঅ্যাপ ফোন নাম্বার (যেমন: 017xxxxxxxx)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 01712345678"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  মাসিক বাসা ভাড়া (টাকা, ঐচ্ছিক)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="যেমন: ৩৫০০"
                  value={newMemberRent}
                  onChange={(e) => setNewMemberRent(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  মেম্বার যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Utility Bill Modal */}
      {isAddUtilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5 text-primary">
                <SlidersHorizontal size={22} />
                <h3 className="text-lg font-bold text-foreground">নতুন ইউটিলিটি বিল যোগ করুন</h3>
              </div>
              <button
                onClick={() => setIsAddUtilityOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUtilitySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  ইউটিলিটি বিলের নাম <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: কারেন্ট বিল / গ্যাস বিল / ইন্টারনেট"
                  value={newUtilityName}
                  onChange={(e) => setNewUtilityName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  বিলের পরিমাণ (টাকা) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="যেমন: ১৫০০"
                  value={newUtilityAmount}
                  onChange={(e) => setNewUtilityAmount(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium font-bold text-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddUtilityOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  বিল যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Logout Confirmation Modal */}
      {isLogoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <LogOut size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">লগআউট নিশ্চিতকরণ</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                আপনি কি নিশ্চিত যে মেসফ্লো অ্যাকাউন্ট থেকে লগআউট করতে চান?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsLogoutOpen(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Item Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Trash2 size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">মুছে ফেলা নিশ্চিত করুন</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                আপনি কি <strong className="text-foreground font-bold">"{deleteTarget.name}"</strong> ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                বাতিল
              </button>
              <button
                onClick={confirmDeleteTarget}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {isMealScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="meal-schedule-title" className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="meal-schedule-title" className="text-lg font-bold">{editingMealScheduleId ? 'মিল পরিকল্পনা এডিট' : 'আগাম মিল পরিকল্পনা'}</h3>
              <button type="button" onClick={() => setIsMealScheduleOpen(false)} aria-label="বন্ধ করুন" className="rounded-full p-1 hover:bg-accent"><X size={18} /></button>
            </div>
            <form onSubmit={submitMealSchedule} className="space-y-4">
              <label className="block space-y-1 text-sm font-medium">সদস্য
                <select value={scheduleMemberId} onChange={(event) => setScheduleMemberId(event.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2">
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-sm font-medium">শুরুর তারিখ
                  <input type="date" required value={scheduleStartDate} onChange={(event) => setScheduleStartDate(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
                </label>
                <label className="block space-y-1 text-sm font-medium">শেষ তারিখ
                  <input type="date" required min={scheduleStartDate} value={scheduleEndDate} onChange={(event) => setScheduleEndDate(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
                </label>
              </div>
              {editingMealScheduleId && scheduleLunchCount === '' && scheduleDinnerCount === '' && <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">পুরোনো পরিকল্পনায় কোন বেলায় মিল ছিল জানা নেই। দুপুর ও রাতের সংখ্যা লিখে পরিকল্পনাটি আপডেট করুন।</p>}
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-sm font-medium">দুপুরে প্রতিদিন কত মিল
                  <input type="number" min="0" step="1" required value={scheduleLunchCount} onChange={(event) => setScheduleLunchCount(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 tabular-nums" />
                </label>
                <label className="block space-y-1 text-sm font-medium">রাতে প্রতিদিন কত মিল
                  <input type="number" min="0" step="1" required value={scheduleDinnerCount} onChange={(event) => setScheduleDinnerCount(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 tabular-nums" />
                </label>
              </div>
              {scheduleLunchCount !== '' && scheduleDinnerCount !== '' && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">প্রতিদিন মোট {Number(scheduleLunchCount) + Number(scheduleDinnerCount)} মিল{Number(scheduleLunchCount) + Number(scheduleDinnerCount) === 0 ? ' — দুই বেলাই বন্ধ' : ''}</p>}
              <p className="text-xs text-muted-foreground">আগে হাতে বদলানো দিনের মিল একই থাকবে। পরিকল্পনার পরে কোনো ঘর হাতে বদলালে সেই দিনের জন্য নতুন সংখ্যাটি কার্যকর হবে।</p>
              {scheduleError && <p role="alert" className="text-sm text-destructive">{scheduleError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsMealScheduleOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm">বাতিল</button>
                <button type="submit" disabled={scheduleSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{scheduleSaving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Market Duty Selection Modal */}
      {isMarketDutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5 text-primary">
                <CalendarDays size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  {editingDutyId ? "বাজার ডিউটি এডিট করুন" : "নতুন বাজার ডিউটি নির্ধারণ"}
                </h3>
              </div>
              <button
                onClick={() => setIsMarketDutyModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMarketDuty} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">
                  মেম্বার নির্বাচন করুন <span className="text-destructive">*</span>
                </label>
                <select
                  value={dutyMemberId}
                  onChange={(e) => setDutyMemberId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.initials})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">
                    শুরু তারিখ (Day) <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={dutyStartDay}
                    onChange={(e) => setDutyStartDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} তারিখ
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">
                    শেষ তারিখ (Day) <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={dutyEndDay}
                    onChange={(e) => setDutyEndDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 31 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} তারিখ
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground font-medium flex items-center justify-between">
                <span>ডিউটি মেয়াদ:</span>
                <strong className="text-primary font-bold">
                  {Math.min(dutyStartDay, dutyEndDay)} থেকে {Math.max(dutyStartDay, dutyEndDay)} তারিখ (মোট {Math.abs(dutyEndDay - dutyStartDay) + 1} দিন)
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-2">
                  বাজার নোট / বিশেষ নির্দেশিকা (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder="যেমন: ১ তারিখ বড় বাজার করা হবে, মাংস ও সবজি কেনা আবশ্যক।"
                  value={dutyNote}
                  onChange={(e) => setDutyNote(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring font-medium"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                {editingDutyId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentDuty = marketDuties.find(d => d.id === editingDutyId);
                      setIsMarketDutyModalOpen(false);
                      if (currentDuty) setDutyDeleteTarget(currentDuty);
                    }}
                    className="rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    ডিউটি মুছুন
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMarketDutyModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                  >
                    {editingDutyId ? "হালনাগাদ করুন" : "সংরক্ষণ করুন"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duty Delete Modal */}
      {dutyDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-foreground">বাজার ডিউটি মুছতে চান?</h3>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{dutyDeleteTarget.memberName}</strong> এর ({dutyDeleteTarget.startDay} থেকে {dutyDeleteTarget.endDay} তারিখ) ডিউটি তালিকা থেকে মুছে যাবে।
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setDutyDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"
              >
                বাতিল
              </button>
              <button
                onClick={handleDeleteMarketDutyConfirm}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <Icon size={18} className="text-primary" />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MealCountEditor({
  memberName,
  date,
  lunch,
  dinner,
  source,
  onLunchChange,
  onDinnerChange,
  onBlur,
}: {
  memberName: string;
  date: string;
  lunch: number;
  dinner: number;
  source: 'manual' | 'planned' | 'automatic';
  onLunchChange: (value: string) => void;
  onDinnerChange: (value: string) => void;
  onBlur: () => void;
}) {
  const sourceTitle = source === 'planned' ? 'আগাম পরিকল্পনা' : source === 'manual' ? 'হাতে দেওয়া মিল' : 'স্বয়ংক্রিয় মিল';
  const inputClass = 'w-12 rounded-md border border-border bg-background px-1 py-1 text-center text-sm font-bold tabular-nums text-foreground outline-none focus:ring-2 focus:ring-primary/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <div className="flex items-center justify-center gap-1.5">
      <label className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
        দুপুর
        <input aria-label={`${memberName} ${date} দুপুরের মিল`} title={sourceTitle} type="number" inputMode="numeric" min="0" step="1" value={lunch} onChange={(event) => onLunchChange(event.target.value)} onBlur={onBlur} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className={inputClass} />
      </label>
      <label className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
        রাত
        <input aria-label={`${memberName} ${date} রাতের মিল`} title={sourceTitle} type="number" inputMode="numeric" min="0" step="1" value={dinner} onChange={(event) => onDinnerChange(event.target.value)} onBlur={onBlur} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className={inputClass} />
      </label>
    </div>
  );
}
