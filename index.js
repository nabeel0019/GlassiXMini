/**
 * index.js
 * Main entry for GlassiX-Mini (Arslan-MD-Mini style base).
 *
 * Requirements:
 *  - npm install @whiskeysockets/baileys axios fs-extra qrcode-terminal
 *  - session folder exists (will be created automatically by Baileys)
 *
 * This file intentionally keeps structure minimal and matches typical Arslan-MD-Mini entry behavior.
 */

const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const config = require('./config.json');
const id = require('./Id.js');
const admin = require('./admin.json');

// load auth state (single-file style for simplicity)
const authFile = path.join(__dirname, 'session', 'auth_info.json');
const { state, saveState } = useSingleFileAuthState(authFile);

// simple command loader (loads commands/*/*.js)
function loadCommands() {
  const commands = new Map();
  const commandsDir = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsDir)) return commands; // no commands yet

  const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const cat of categories) {
    const catDir = path.join(commandsDir, cat);
    const files = fs.readdirSync(catDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(catDir, file);
      delete require.cache[require.resolve(filePath)];
      const cmd = require(filePath);
      if (cmd && cmd.name) {
        commands.set(cmd.name, cmd);
        console.log(chalk.blue(`Loaded command: ${cmd.name}  (${cat}/${file})`));
      }
    }
  }
  return commands;
}

async function start() {
  console.log(chalk.cyan.bold(`\nStarting ${id.getBotSignature()}  v${config.version}\n`));

  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 2204, 13], isLatest: false }));
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: [config.botName || 'GlassiX-Mini', 'Chrome', config.version || '1.1.2'],
    version
  });

  // show QR in terminal if no session (but you asked to use number-based session.
  // if auth file absent, show QR so user can pair once; next times saved session will be used)
  sock.ev.on('connection.update', (update) => {
    if (update.qr) {
      console.log(chalk.yellow('No saved session. Scan QR to create session (one-time).'));
      qrcode.generate(update.qr, { small: true });
    }
    if (update.connection === 'open') {
      console.log(chalk.green(`Connected as ${config.ownerName} (${config.owner})`));
    }
  });

  sock.ev.on('creds.update', saveState);

  // Load commands
  const commands = loadCommands();

  // messages handler
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg || !msg.message) return;
      if (msg.key && msg.key.fromMe) return;

      // extract text
      const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || (msg.message?.imageMessage && msg.message?.imageMessage.caption) || '';
      if (!messageContent) return;

      // prefix check
      if (!messageContent.startsWith(config.prefix)) return;

      const args = messageContent.slice(config.prefix.length).trim().split(/ +/);
      const cmdName = args.shift().toLowerCase();

      if (commands.has(cmdName)) {
        const cmd = commands.get(cmdName);
        // ownerOnly check
        if (cmd.ownerOnly) {
          const sender = msg.key.participant || msg.key.remoteJid;
          const ownerJid = (admin.owners && admin.owners[0]) || `${config.owner}@s.whatsapp.net`;
          if (!String(sender).includes(ownerJid.replace('@s.whatsapp.net', ''))) {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner can use this command.' });
            return;
          }
        }
        try {
          await cmd.execute(sock, msg, args, { config, admin });
        } catch (e) {
          console.error('Command execute error:', e);
        }
      }
    } catch (e) {
      console.error('messages.upsert handler error:', e);
    }
  });

  // simple presence logger: device connected state
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') {
      console.log(chalk.green(`[${id.timestamp()}] Connected OK — device session loaded.`));
    } else {
      console.log(chalk.gray(`[${id.timestamp()}] Connection update:`), u);
    }
  });

  // group participant welcome/goodbye (if commands/wellcome exists it can control; still basic)
  sock.ev.on('group-participants.update', async (update) => {
    try {
      const groupId = update.id;
      for (const userId of update.participants) {
        const number = userId.split('@')[0];
        if (update.action === 'add') {
          // send simple welcome (can be replaced by your wellcome command)
          await sock.sendMessage(groupId, { text: `👋 Welcome @${number}`, mentions: [userId] });
        }
        if (update.action === 'remove') {
          await sock.sendMessage(groupId, { text: `😢 Goodbye @${number}`, mentions: [userId] });
        }
      }
    } catch (e) {
      console.error('group-participants.update error:', e);
    }
  });

  console.log(chalk.green('✅ GlassiX-Mini is running. Commands ready:', commands.size));
}

start().catch((e) => {
  console.error('Start error:', e);
  process.exit(1);
});