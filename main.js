/*
 * Create By Dabi
 * © 2025
 */

require('./toolkit/setting.js');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const { makeWASocket, useMultiFileAuthState, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { getMenuText, handleMenuCommand } = require('./plugins/Main_Menu/menu');
const { isPrefix } = require('./toolkit/setting');
const { Format } = require('./toolkit/helper');
const { updateBio } = require('./plugins/Menu_Owner/autobio');

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const logger = pino({ level: 'silent' });

const folderName = 'temp';
fs.mkdir(folderName, (err) => {
  if (!err) console.log(chalk.green.bold('Berhasil membuat folder :', folderName));
});

global.plugins = {};
global.categories = {};

global.autoBio = true;

const pluginFolder = path.join(__dirname, './plugins');
const loadPlugins = (directory) => {
  if (!fs.existsSync(directory)) return console.log(chalk.yellow(`⚠️ Folder plugin tidak ditemukan: ${directory}`));

  let loadedCount = 0;
  let errorCount = 0;
  const errorMessages = [];
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const subDirResults = loadPlugins(fullPath);
      loadedCount += subDirResults.loaded;
      errorCount += subDirResults.errors;
      errorMessages.push(...subDirResults.messages);
      return;
    }
    if (!file.endsWith('.js')) return;

    try {
      const pluginName = path.basename(fullPath, '.js');
      const plugin = require(fullPath);
      if (plugin?.run) {
        global.plugins[pluginName] = plugin;

        const category = plugin.tags || 'Uncategorized';
        if (!global.categories[category]) global.categories[category] = [];
        global.categories[category].push(plugin.command);

        loadedCount++;
      }
    } catch (err) {
      errorCount++;
      errorMessages.push(`❌ Plugin tidak berhasil dimuat: ${file} error: ${err.message}`);
    }
  });

  if (directory === pluginFolder) {
    if (errorCount === 0) {
      console.log(chalk.green(`✅ Semua plugins (${loadedCount}) berhasil dimuat`));
    } else {
      errorMessages.forEach(msg => console.log(msg));
      console.log(chalk.yellow(`⚠️ Total plugins berhasil dimuat: ${loadedCount}, gagal: ${errorCount}`));
    }
  }

  return { loaded: loadedCount, errors: errorCount, messages: errorMessages };
};

const dbFolder = path.join(__dirname, './toolkit/db');
const dbFile = path.join(dbFolder, 'database.json');

const initializeDatabase = () => {
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
    console.log(chalk.green.bold('✅ Folder database dibuat:', dbFolder));
  }

  if (!fs.existsSync(dbFile)) {
    const initialData = {
      Private: {},
      Grup: {}
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
    console.log(chalk.green.bold('✅ File database dibuat:', dbFile));
  }
};

initializeDatabase();

const readDB = () => {
  try {
    let data = fs.readFileSync(dbFile, 'utf-8');
    return data ? JSON.parse(data) : { Private: {}, Grup: {} };
  } catch (error) {
    console.error('❌ Error membaca database:', error);
    return { Private: {}, Grup: {} };
  }
};

const getWelcomeStatus = (chatId) => {
  let db = readDB();
  let groupData = Object.values(db.Grup || {}).find(group => group.Id === chatId);
  return groupData?.Welcome?.welcome === true;
};

const getWelcomeText = (chatId) => {
  let db = readDB();
  let groupData = Object.values(db.Grup || {}).find(group => group.Id === chatId);
  return groupData?.Welcome?.welcomeText || "👋 Selamat datang @user di grup!";
};

setInterval(() => {
  const dbPath = path.join(__dirname, './toolkit/db/database.json');
  if (!fs.existsSync(dbPath)) return;

  let db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  Object.keys(db.Private).forEach((key) => {
    const user = db.Private[key];
    if (user.premium?.prem && user.premium.time > 0) {
      user.premium.time -= 60000;
      if (user.premium.time <= 0) {
        user.premium.prem = false;
      }
    }
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}, 60000);

const isMuted = async (chatId, senderId, conn) => {
  const db = readDB();
  const groupData = Object.values(db.Grup).find((g) => g.Id === chatId);

  if (groupData?.mute) {
    const groupMetadata = await conn.groupMetadata(chatId);
    const groupAdmins = groupMetadata.participants.filter((p) => p.admin);
    const isAdmin = groupAdmins.some((admin) => admin.id === senderId);

    if (!isAdmin) return true;
  }

  return false;
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const conn = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: false,
      logger: logger,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
    });

    if (!state.creds?.me?.id) {
      console.log(chalk.blue('📱 Masukkan nomor bot WhatsApp Anda:'));
      const phoneNumber = await question('> ');

      const code = await conn.requestPairingCode(phoneNumber);
      console.log(chalk.green('🔗 Kode Pairing:'), code?.match(/.{1,4}/g)?.join('-') || code);
    }

    conn.ev.on('connection.update', ({ connection }) => {
      const statusMessage = {
        open: () => {
          console.log(chalk.green.bold('✅ Bot online!'));
          if (global.autoBio) {
            updateBio(conn);
          }
        },
        connecting: () => console.log(chalk.yellow('🔄 Menghubungkan kembali...')),
        close: () => {
          console.log(chalk.red('❌ Koneksi terputus, mencoba menyambung ulang...'));
          startBot();
        }
      };
      statusMessage[connection]?.();
    });

    conn.ev.on('messages.upsert', async ({ messages }) => {
      if (!messages?.length) return;
      const message = messages[0];
      if (!message?.message) return;

      const senderId = message.key.participant || message.key.remoteJid;
      const time = Format.time(Math.floor(Date.now() / 1000));
      const chatId = message.key.remoteJid;
      const isGroup = chatId.endsWith('@g.us');

      let displayName = message.pushName || 'Pengguna';
      if (isGroup) {
        const metadata = await conn.groupMetadata(chatId);
        displayName = `${metadata.subject} | ${displayName}`;
      } else if (chatId === 'status@broadcast') {
        displayName = `${displayName} | Status`;
      }

      let textMessage = '';
      let mediaInfo = '';

      if (message.message.conversation) textMessage = message.message.conversation;
      else if (message.message.extendedTextMessage?.text) textMessage = message.message.extendedTextMessage.text;
      else if (message.message.imageMessage?.caption) textMessage = message.message.imageMessage.caption;
      else if (message.message.videoMessage?.caption) textMessage = message.message.videoMessage.caption;

      const mediaTypes = {
        imageMessage: '[ Gambar ]',
        videoMessage: '[ Video ]',
        audioMessage: '[ Audio ]',
        documentMessage: '[ Dokumen ]',
        stickerMessage: '[ Stiker ]',
        locationMessage: '[ Lokasi ]',
        contactMessage: '[ Kontak ]',
        pollCreationMessage: '[ Polling ]',
        liveLocationMessage: '[ Lokasi ]',
        reactionMessage: '[ Reaksi ]'
      };

      for (const [key, value] of Object.entries(mediaTypes)) {
        if (message.message[key]) mediaInfo = value;
      }

      console.log(chalk.yellow.bold(`【 ${displayName} 】:`) + chalk.cyan.bold(` [ ${time} ]`));
      if (mediaInfo && textMessage) console.log(chalk.white(`  ${mediaInfo} | [ ${textMessage} ]`));
      else if (mediaInfo) console.log(chalk.white(`  ${mediaInfo}`));
      else if (textMessage) console.log(chalk.white(`  [ ${textMessage} ]`));

      if (await isMuted(chatId, senderId, conn)) return;

      if ((isGroup && global.readGroup) || (!isGroup && global.readPrivate)) {
        await conn.readMessages([message.key]);
      }

      if ((isGroup && global.autoTyping) || (!isGroup && global.autoTyping)) {
        await conn.sendPresenceUpdate("composing", chatId);
        setTimeout(async () => await conn.sendPresenceUpdate("paused", chatId), 3000);
      }

      for (const plugin of Object.values(global.plugins)) {
        try {
          const args = textMessage.trim().split(/\s+/).slice(1);
          await plugin.run(conn, message, { args, isPrefix });
        } catch (err) {
          console.log(chalk.red(`❌ Error pada plugin: ${err.message}`));
        }
      }
    });

    conn.ev.on('group-participants.update', async (event) => {
      try {
        let { id: chatId, participants, action } = event;

        if (getWelcomeStatus(chatId) && action === "add") {
          let welcomeText = getWelcomeText(chatId);

          for (let participant of participants) {
            let userTag = `@${participant.split('@')[0]}`;
            await conn.sendMessage(chatId, {
              text: welcomeText.replace(/@user/g, userTag),
              mentions: [participant]
            });
          }
        }

      } catch (error) {
        console.error('❌ Error pada event group-participants.update:', error);
      }
    });

    conn.ev.on('creds.update', saveCreds);

  } catch (error) {
    console.error(chalk.red('❌ Error saat menjalankan bot:'), error);
  }
};

console.log(chalk.cyan.bold('Create By Dabi\n'));
loadPlugins(pluginFolder);
startBot();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.green.bold(`[UPDATE] ${__filename}`));
  delete require.cache[file];
  require(file);
});