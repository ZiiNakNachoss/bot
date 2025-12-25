const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")
const P = require("pino")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")

  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    auth: state,
    browser: ["Railway", "Chrome", "1.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  if (!state.creds.registered) {
    rl.question("📱 Masukkan nombor WhatsApp (contoh: 60123456789): ", async (number) => {
      const code = await sock.requestPairingCode(number)
      console.log("🔑 PAIRING CODE:", code.match(/.{1,4 인정}/g)?.join("-") || code)
      rl.close()
    })
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ Bot WhatsApp connected (PAIRING CODE)")
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (text === "ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "pong 🏓" })
    }
  })
}

startBot()
process.on("uncaughtException", console.error)
