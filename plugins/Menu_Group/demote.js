module.exports = {
  name: 'demote',
  command: ['demote', 'stopadmin', 'demoteadmin'],
  tags: 'Group Menu',
  desc: 'Turunkan admin grup menjadi anggota',

  run: async (conn, message, { isPrefix }) => {
    const chatId = message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const senderId = message.key.participant || chatId.replace(/:\d+@/, '@');

    const textMessage = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    if (!textMessage) return;

    const prefix = isPrefix.find(p => textMessage.startsWith(p));
    if (!prefix) return;

    const args = textMessage.slice(prefix.length).trim().split(/\s+/);
    const commandText = args.shift().toLowerCase();

    if (!module.exports.command.includes(commandText)) return;

    let targetId = target(message, senderId);
    const mentionTarget = targetId;

    const teks = `⚠️ Harap mention atau reply admin yang ingin diturunkan!\nContoh: ${prefix}demote @${mentionTarget}`;
    const teks1 = `❌ @${mentionTarget} bukan admin grup!`;
    const teks2 = `✅ Berhasil menurunkan @${mentionTarget} dari admin grup!`;

    if (!isGroup) {
      return conn.sendMessage(chatId, { text: '⚠️ Perintah ini hanya bisa digunakan dalam grup!' }, { quoted: message });
    }

    const groupMetadata = await conn.groupMetadata(chatId);
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && p.admin);
    const isUserAdmin = groupMetadata.participants.some(p => p.id === senderId && p.admin);

    if (!isUserAdmin) {
      return conn.sendMessage(chatId, { text: '❌ Hanya admin grup yang bisa menggunakan perintah ini!' }, { quoted: message });
    }

    if (!isBotAdmin) {
      return conn.sendMessage(chatId, { text: '❌ Bot bukan admin, tidak bisa menurunkan admin!' }, { quoted: message });
    }

    const mentionIds = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const id = mentionIds[0];

    if (!id) {
      return conn.sendMessage(chatId, {
        text: teks,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message });
    }

    const isTargetAdmin = groupMetadata.participants.some(p => p.id === id && p.admin);
    if (!isTargetAdmin) {
      return conn.sendMessage(chatId, {
        text: teks1,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message });
    }

    try {
      await conn.groupParticipantsUpdate(chatId, [id], 'demote');

      conn.sendMessage(chatId, {
        text: teks2,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message });
    } catch (err) {
      console.error(err);
      conn.sendMessage(chatId, { text: '❌ Gagal menurunkan admin. Pastikan bot adalah admin dan ID yang dimaksud valid.' }, { quoted: message });
    }
  }
};