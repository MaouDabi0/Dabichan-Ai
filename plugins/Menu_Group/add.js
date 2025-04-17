module.exports = {
  name: 'add',
  command: ['add', 'invite', 'tambahkan'],
  tags: 'Group Menu',
  desc: 'Menambahkan anggota ke grup (hanya bisa digunakan oleh admin).',

  run: async (conn, message, { isPrefix }) => {
    const chatId = message?.key?.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const senderId = isGroup ? message.key.participant : chatId;
    const mtype = Object.keys(message.message || {})[0];
    const textMessage =
      (mtype === "conversation" && message.message?.conversation) ||
      (mtype === "extendedTextMessage" && message.message?.extendedTextMessage?.text) ||
      "";

    if (!textMessage) return;

    const prefix = isPrefix.find((p) => textMessage.startsWith(p));
    if (!prefix) return;

    const args = textMessage.slice(prefix.length).trim().split(/\s+/);
    const commandText = args[0]?.toLowerCase();
    if (!module.exports.command.includes(commandText)) return;

    let targetId = target(message, senderId);
    const mentionTarget = targetId;

    if (!isGroup)
      return conn.sendMessage(chatId, { text: "❌ Perintah ini hanya bisa digunakan dalam grup!" });

    const groupMetadata = await conn.groupMetadata(chatId);
    const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
    const botNumber = conn.user.id.split(":")[0] + "@s.whatsapp.net";

    if (!groupAdmins.includes(senderId))
      return conn.sendMessage(chatId, { text: "❌ Perintah ini hanya bisa digunakan oleh admin grup!" });

    if (!groupAdmins.includes(botNumber))
      return conn.sendMessage(chatId, { text: "❌ Bot harus menjadi admin untuk menggunakan perintah ini!" });

    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedSender = message.message?.extendedTextMessage?.contextInfo?.participant;

    let targetUser = quotedSender;

    if (!targetUser && args[1]) {
      const number = args[1].replace(/[^0-9]/g, "");
      if (number.length < 8) {
        return conn.sendMessage(chatId, { text: "❌ Nomor tidak valid!" }, { quoted: message });
      }
      targetUser = number + "@s.whatsapp.net";
    }

    if (!targetUser) {
      return conn.sendMessage(chatId, {
        text: `❌ Gunakan perintah ini dengan format:\n• Reply pesan target\n• ${prefix}add 628xxxxxxxxx`
      }, { quoted: message });
    }

    const alreadyInGroup = groupMetadata.participants.some(p => p.id === targetUser);
    if (alreadyInGroup) {
      return conn.sendMessage(chatId, { text: "✅ Target sudah berada dalam grup." }, { quoted: message });
    }

    await conn.groupParticipantsUpdate(chatId, [targetUser], "add")
      .then(() => conn.sendMessage(chatId, {
        text: `✅ Berhasil menambahkan @${mentionTarget}`,
        mentions: [`${targetId}@s.whatsapp.net`]
      }, { quoted: message }))
      .catch(() => conn.sendMessage(chatId, {
        text: "❌ Gagal menambahkan anggota. Pastikan nomor aktif dan bot adalah admin!"
      }, { quoted: message }));
  }
};