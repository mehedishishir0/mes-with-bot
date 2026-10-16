import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

const targets = [
  { path: path.join(ROOT, 'auth_info'), label: 'WhatsApp session (auth_info/)' },
  { path: path.join(ROOT, 'baileys_store.json'), label: 'Message store (baileys_store.json)' },
  { path: path.join(ROOT, 'active_polls.json'), label: 'Active polls (active_polls.json)' },
]

console.log('\n🔄 Mess Bot — Session Reset\n' + '='.repeat(40))

let deletedCount = 0

for (const target of targets) {
  try {
    if (fs.existsSync(target.path)) {
      fs.rmSync(target.path, { recursive: true, force: true })
      console.log(`✅ Deleted: ${target.label}`)
      deletedCount++
    } else {
      console.log(`⏭️  Not found (skip): ${target.label}`)
    }
  } catch (err) {
    console.error(`❌ Error deleting ${target.label}:`, err)
  }
}

console.log('\n' + '='.repeat(40))
if (deletedCount > 0) {
  console.log(`🎉 Reset complete! (${deletedCount} item(s) cleared)`)
} else {
  console.log('ℹ️  Nothing to reset — already clean.')
}
console.log('\n📱 এখন চালান: pnpm run dev')
console.log('   ব্রাউজারে খুলুন: http://localhost:4000')
console.log('   WhatsApp > Linked Devices > Link a Device > QR স্ক্যান করুন\n')
