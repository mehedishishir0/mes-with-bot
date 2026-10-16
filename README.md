# Mess Management — ব্যবহারকারী নির্দেশিকা

এই সিস্টেমে প্রতিটি মেসের নিজস্ব ওয়েবসাইট account এবং WhatsApp group থাকে। সদস্যরা WhatsApp poll-এ ভোট দিলে মিলের সংখ্যা সরাসরি ওয়েবসাইটে জমা হয়।

**ওয়েবসাইট:** <https://mess-management-tech.vercel.app>

---

## একজন নতুন মেস চালু করার সম্পূর্ণ ধাপ

### ১. মেস account তৈরি করুন

1. ওয়েবসাইটে যান এবং **Sign up / Create mess** করুন।
2. মেসের নাম, নিজের নাম, সদস্যদের তথ্য এবং প্রয়োজনীয় হিসাবের তথ্য পূরণ করুন।
3. Dashboard খুলে **সদস্যবৃন্দ** পেজে প্রত্যেক সদস্যকে যোগ করুন। ফোন নম্বরটি সঠিকভাবে লিখুন।

### ২. WhatsApp group প্রস্তুত করুন

1. মেসের জন্য একটি WhatsApp group তৈরি করুন বা বর্তমান group ব্যবহার করুন।
2. Bot যে WhatsApp account দিয়ে linked আছে, সেই account-টিকে group-এ **add** করুন।
3. Bot-কে group থেকে remove করবেন না। Bot group-এ না থাকলে poll পাঠাতে পারবে না।

### ৩. ওয়েবসাইটের সঙ্গে group যুক্ত করুন

1. ওয়েবসাইটে login করে **Settings** পেজে যান।
2. **Connect code তৈরি করুন** চাপুন।
3. পাওয়া ১৬ অক্ষরের code কপি করুন। Codeটি ১৫ মিনিট কার্যকর থাকে।
4. আপনার WhatsApp group-এ পাঠান:

   ```text
   !connect আপনার-কোড
   ```

5. Bot-এর নিশ্চিতকরণ message এলে group যুক্ত হয়েছে। Settings পেজে group-এর নাম দেখা যাবে।

> Group ID, WhatsApp LID বা terminal log কপি করার প্রয়োজন নেই।

### ৪. সদস্যদের WhatsApp account যুক্ত করুন

প্রত্যেক সদস্যের জন্য একবার করে এই কাজটি করতে হবে। পরের poll-গুলোর জন্য আর লাগবে না।

1. **সদস্যবৃন্দ** পেজে সদস্যের পাশে **লিংক কোড তৈরি করুন** চাপুন।
2. Codeটি শুধু সেই সদস্যকে দিন। Codeটি ২৪ ঘণ্টা কার্যকর থাকে।
3. সদস্য তাঁর নিজের WhatsApp account থেকে মেস group-এ পাঠাবেন:

   ```text
   !link তার-কোড
   ```

4. Bot সফল message পাঠালে ঐ সদস্যের ভোট তাঁর নামেই website-এ জমা হবে।

> Code অন্য কাউকে দেবেন না। অন্য কেউ code ব্যবহার করলে সেই account-টি ভুল সদস্যের সঙ্গে যুক্ত হয়ে যাবে।

---

## প্রতিদিনের স্বয়ংক্রিয় নিয়ম

সময়গুলো বাংলাদেশ সময়।

| সময় | কী হবে |
| --- | --- |
| রাত ১২:১০ | দুপুরের মিলের poll যাবে |
| সকাল ৯:৪৫ | দুপুরের vote শেষ হওয়ার ১৫ মিনিট আগে reminder যাবে |
| সকাল ১০:০০ | দুপুরের vote lock হবে এবং সদস্যভিত্তিক summary যাবে |
| সকাল ১১:০০ | রাতের মিলের poll যাবে |
| দুপুর ২:৪৫ | রাতের vote শেষ হওয়ার ১৫ মিনিট আগে reminder যাবে |
| দুপুর ৩:০০ | রাতের vote lock হবে এবং সদস্যভিত্তিক summary যাবে |

প্রতিটি poll-এ সদস্য **০ থেকে ৬** মিল নির্বাচন করতে পারেন।

- ভোট না দিলে সেই বেলার মিল স্বয়ংক্রিয়ভাবে **০** থাকবে।
- Lock হওয়ার পর vote পরিবর্তন করলেও হিসাব বদলাবে না।
- Lock হওয়ার পরে vote দিলে bot সদস্যের নামসহ জানাবে যে vote আর গণনা করা হয়নি।

---

## WhatsApp command তালিকা

সাধারণ সদস্যদের নিয়মিত শুধু poll-এ vote দিতে হবে। নিচের command-গুলো manager-এর test বা control করার জন্য।

| Command | কাজ |
| --- | --- |
| `!status` | Bot online আছে কি না দেখুন |
| `!connect CODE` | Settings থেকে পাওয়া code দিয়ে group যুক্ত করুন |
| `!link CODE` | একজন সদস্যের WhatsApp account যুক্ত করুন |
| `!lunch` বা `!poll-lunch` | সঙ্গে সঙ্গে দুপুরের test poll পাঠান |
| `!dinner` বা `!poll-dinner` | সঙ্গে সঙ্গে রাতের test poll পাঠান |
| `!lock-lunch` | দুপুরের active poll lock করে summary পাঠান |
| `!lock-dinner` | রাতের active poll lock করে summary পাঠান |
| `!summary` | আজকের lunch ও dinner-এর live summary দেখুন |
| `!help` | Command list দেখুন |

`!lunch` বা `!dinner` দিলে একটি poll এবং vote দেওয়ার সময়ের একটি notice যাবে। এটি স্বাভাবিক।

---

## প্রথমবার test করার নিয়ম

1. Group connect করুন।
2. অন্তত একজন সদস্যকে `!link CODE` দিয়ে যুক্ত করুন।
3. Group-এ পাঠান:

   ```text
   !status
   ```

   Bot একবার status reply দিলে connection ঠিক আছে।

4. পাঠান:

   ```text
   !lunch
   ```

5. Linked member দিয়ে poll-এ একটি meal count নির্বাচন করুন।
6. ওয়েবসাইট refresh করে আজকের তারিখে lunch meal update হয়েছে কি না দেখুন।
7. প্রয়োজনে `!summary` পাঠিয়ে WhatsApp থেকেই মোট হিসাব মিলিয়ে নিন।

---

## নতুন সদস্য যোগ করা

1. ওয়েবসাইটের **সদস্যবৃন্দ** পেজ থেকে সদস্য add করুন।
2. তাঁর ফোন নম্বর দিন।
3. তাঁর জন্য **লিংক কোড তৈরি করুন**।
4. তাঁকে group-এ `!link CODE` পাঠাতে বলুন।

একবার link হলে পরের সব poll-এ তাঁর vote স্বয়ংক্রিয়ভাবে চিহ্নিত হবে।

## WhatsApp group বদলানো

1. Website → **Settings** এ যান।
2. **গ্রুপ বিচ্ছিন্ন করুন** চাপুন।
3. নতুন group-এ bot WhatsApp account-টি add করুন।
4. নতুন করে **Connect code তৈরি করুন**।
5. নতুন group-এ `!connect CODE` পাঠান।

সদস্যরা একই থাকলে তাঁদের আবার `!link` করার প্রয়োজন নেই।

---

## সাধারণ সমস্যা ও সমাধান

### একই command-এ দুইবার reply আসে

একই WhatsApp account দিয়ে দুইটি bot চালু থাকলে এটি হয়। Production VPS bot চালু থাকার সময় local computer-এ `pnpm run dev` চালাবেন না। পুরোনো local bot terminal-এ `Ctrl + C` চাপুন।

### Bot reply দিচ্ছে না

1. Group-এ bot account আছে কি না দেখুন।
2. `!status` পাঠান।
3. Settings পেজে group connected আছে কি না দেখুন।
4. Bot account WhatsApp-এর Linked Devices থেকে logout হয়ে গেলে administrator-কে QR scan করে আবার link করতে হবে।

### Vote website-এ দেখা যাচ্ছে না

1. যিনি vote দিয়েছেন তিনি `!link CODE` দিয়ে linked কি না যাচাই করুন।
2. Vote poll lock হওয়ার আগে দেওয়া হয়েছে কি না দেখুন।
3. Website refresh করে আজকের তারিখটি খুলুন।

### Connect বা link code কাজ করছে না

Code-এর সময়সীমা শেষ হয়ে যেতে পারে। Website থেকে নতুন code তৈরি করে আবার চেষ্টা করুন।

---

## Administrator-এর জন্য deployment note

ওয়েবসাইট Vercel-এ এবং WhatsApp bot VPS-এ চলছে। সাধারণ মেস manager-এর VPS বা code পরিবর্তনের প্রয়োজন নেই। Bot update বা QR reset লাগলে system administrator-এর সাহায্য নিন।
