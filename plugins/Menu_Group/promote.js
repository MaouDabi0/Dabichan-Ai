module.exports = {
  name: 'promote',
  command: ['promote', 'jadiadmin', 'promoteadmin'],
  tags: 'Group Menu',
  description: 'Promosikan anggota menjadi admin grup',

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

    const teks = `⚠️ Harap mention atau reply anggota yang ingin dipromosikan!\nContoh: ${prefix}promote @${mentionTarget}`;
    const teks1 = `✅ Berhasil mempromosikan @${mentionTarget} menjadi admin grup!`;

    if (!isGroup) {
      return conn.sendMessage(chatId, { text: '⚠️ Perintah ini hanya bisa digunakan dalam grup!' }, { quoted: message });
    }

    const groupMetadata = await conn.groupMetadata(chatId);
    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    const isBotAdmin = groupMetadata.participants.some(p => p.id === botNumber && p.admin);
    const isUserAdmin = groupMetadata.participants.some(p => p.id === senderId && p.admin);

    if (!isUserAdmin) {
      return conn.sendMessage(chatId, { text: '❌ Kamu bukan Admin!' }, { quoted: message });
    }

    if (!isBotAdmin) {
      return conn.sendMessage(chatId, { text: '❌ Bot bukan admin' }, { quoted: message });
    }

    const mentionIds = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const id = mentionIds[0];

    if (!id) {
      return conn.sendMessage(chatId, {
        text: teks,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message });
    }

    try {
      await conn.groupParticipantsUpdate(chatId, [id], 'promote');

      conn.sendMessage(chatId, {
        text: teks1,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message });
    } catch (err) {
      console.error(err);
      conn.sendMessage(chatId, { text: '❌ Gagal mempromosikan anggota. Pastikan bot adalah admin dan ID yang dimaksud valid.' }, { quoted: message });
    }
  }
};