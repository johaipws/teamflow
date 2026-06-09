const fs = require('fs')
const path = require('path')
const webpush = require('web-push')

const keyFile = path.join(__dirname, '..', '.vapid-keys.json')

function loadKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    }
  }
  if (fs.existsSync(keyFile)) {
    return JSON.parse(fs.readFileSync(keyFile, 'utf8'))
  }
  const keys = webpush.generateVAPIDKeys()
  fs.writeFileSync(keyFile, JSON.stringify(keys, null, 2))
  return keys
}

const keys = loadKeys()
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@teamflow.local',
  keys.publicKey,
  keys.privateKey
)

module.exports = { webpush, publicKey: keys.publicKey }
