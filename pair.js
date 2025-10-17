/**
 * Glassix-Mini Pair System
 * Author: Nabeed
 * Description: Multi-number WhatsApp connection system (no QR — direct number link)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const P = require("pino");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

// ======== LOAD CONFIG ==========
const configPath = path.join(__dirname, "config.json");
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath));
}

// ======== LOGGING ==========
const logger = P({ level: "silent" });

// ======== SESSION HANDLER ==========
async function connectToWhatsApp(number) {
  try {
    const sessionDir = path.join(__dirname, "sessions", number);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      printQRInTerminal: false,
      logger,
      auth: state,
      browser: ["Glassix-Mini", "Chrome", "1.0"],
    });

    // Auto save credentials
    sock.ev.on("creds.update", saveCreds);

    // Connection updates
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
          console.log(`[Glassix-Mini] Reconnecting ${number}...`);
          connectToWhatsApp(number);
        } else {
          console.log(`[Glassix-Mini] Logged out: ${number}`);
        }
      } else if (connection === "open") {
        console.log(`[Glassix-Mini] Connected to WhatsApp: ${number}`);
      }
    });

    // Event: new message
    sock.ev.on("messages.upsert", async (msg) => {
      const m = msg.messages[0];
      if (!m.message || m.key.fromMe) return;

      const sender = m.key.remoteJid;
      const textMsg = m.message.conversation || m.message.extendedTextMessage?.text || "";

      if (textMsg.toLowerCase() === "ping") {
        await sock.sendMessage(sender, { text: "🏓 Pong! Glassix-Mini is active." });
      }
    });

    return sock;
  } catch (err) {
    console.error("Error in connectToWhatsApp:", err);
  }
}

// ======== ROUTES ==========

// Home Page (Interface)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "main.html"));
});

// Connect via Number
app.post("/connect", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ error: "Number is required" });

  await connectToWhatsApp(number);
  return res.json({ success: true, message: `Glassix-Mini connected to ${number}` });
});

// Live Console (for front-end logs)
app.get("/console", (req, res) => {
  res.sendFile(path.join(__dirname, "console.html"));
});

// ======== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🌐 Glassix-Mini Pair Server running on port ${PORT}`);
});