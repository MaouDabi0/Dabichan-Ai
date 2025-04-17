const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../../toolkit/db/database.json');

function sanitizeGroupName(name) {
  return name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
}

module.exports = {
  name: 'warn',
  command: ['warn', 'warning'],
  tags: ['admin'],
  run: async (conn, message, { isPrefix }) => {
    const chatId = message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const senderId = isGroup ? message.key.participant : chatId.replace(/:\d+@/, '@');
    const textMessage =
      message.message?.conversation || message.message?.extendedTextMessage?.text || '';

    if (!textMessage) return;

    const prefix = isPrefix.find((p) => textMessage.startsWith(p));
    if (!prefix) return;

    const args = textMessage.slice(prefix.length).trim().split(/\s+/);
    const commandText = args.shift().toLowerCase();
    if (!module.exports.command.includes(commandText)) return;

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    if (!data.Grup) data.Grup = {};
    if (!data.Private) data.Private = {};
    if (!data.Warning) data.Warning = {};

    if (!isGroup) return conn.sendMessage(chatId, { text: 'Fitur ini hanya untuk grup!' }, { quoted: message });

    const metadata = await conn.groupMetadata(chatId);
    const admins = metadata.participants.filter(p => p.admin !== null).map(p => p.id);
    const isAdmin = admins.includes(senderId);

    if (!isAdmin) {
      return conn.sendMessage(chatId, { text: 'Hanya admin yang bisa menggunakan perintah ini.' }, { quoted: message });
    }

    const rawGroupName = metadata.subject || `grup${Object.keys(data.Grup).length + 1}`;
    const groupName = sanitizeGroupName(rawGroupName);

    if (!args[0]) {
      const contoh = `Contoh penggunaan:
.warn 1 @tag/reply
.warn set <angka>
.warn reset @tag/reply
.listwarn`;
      return conn.sendMessage(chatId, { text: contoh }, { quoted: message });
    }

    if (args[0] === 'set') {
      const jumlah = parseInt(args[1]);
      if (isNaN(jumlah)) return conn.sendMessage(chatId, { text: 'Masukkan angka maksimum peringatan.' }, { quoted: message });

      if (!data.Grup[groupName]) data.Grup[groupName] = { Id: chatId };
      data.Grup[groupName].setWarn = jumlah;
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
      return conn.sendMessage(chatId, { text: `Set maksimum warning menjadi ${jumlah} untuk grup *${rawGroupName}*.` }, { quoted: message });
    }

    if (args[0] === 'reset') {
      const target = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || message.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) return conn.sendMessage(chatId, { text: 'Tag atau reply pengguna untuk mereset warning.' }, { quoted: message });

      const privateKey = Object.keys(data.Private || {}).find(k => data.Private[k].Nomor === target);
      if (privateKey) {
        data.Private[privateKey].warn = 0;
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return conn.sendMessage(chatId, { text: `Warning untuk @${target.split('@')[0]} telah direset.`, mentions: [target] }, { quoted: message });
      }

      if (data.Warning[target]) {
        data.Warning[target].warn = 0;
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return conn.sendMessage(chatId, { text: `Warning untuk @${target.split('@')[0]} telah direset.`, mentions: [target] }, { quoted: message });
      }

      return conn.sendMessage(chatId, { text: `@${target.split('@')[0]} tidak memiliki data warning.`, mentions: [target] }, { quoted: message });
    }

    if (args[0] === '1') {
      const target = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || message.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target) return conn.sendMessage(chatId, { text: 'Tag atau reply pengguna yang ingin diberi peringatan.' }, { quoted: message });

      const privateKey = Object.keys(data.Private || {}).find(k => data.Private[k].Nomor === target);
      const groupSetWarn = data.Grup[groupName]?.setWarn || 3;

      if (privateKey) {
        data.Private[privateKey].warn = (data.Private[privateKey].warn || 0) + 1;

        if (data.Private[privateKey].warn >= groupSetWarn) {
          await conn.groupParticipantsUpdate(chatId, [target], 'remove');
          conn.sendMessage(chatId, { text: `@${target.split('@')[0]} dikeluarkan karena melampaui batas peringatan.`, mentions: [target] }, { quoted: message });
        } else {
          conn.sendMessage(chatId, { text: `@${target.split('@')[0]} diberi peringatan (${data.Private[privateKey].warn}/${groupSetWarn})`, mentions: [target] }, { quoted: message });
        }
      } else {
        if (!data.Warning[target]) {
          data.Warning[target] = { idNomor: target, warn: 1 };
        } else {
          data.Warning[target].warn += 1;
        }

        if (data.Warning[target].warn >= groupSetWarn) {
          await conn.groupParticipantsUpdate(chatId, [target], 'remove');
          conn.sendMessage(chatId, { text: `@${target.split('@')[0]} dikeluarkan karena melampaui batas peringatan.`, mentions: [target] }, { quoted: message });
        } else {
          conn.sendMessage(chatId, { text: `@${target.split('@')[0]} diberi peringatan (${data.Warning[target].warn}/${groupSetWarn})`, mentions: [target] }, { quoted: message });
        }
      }

      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }
  }
};