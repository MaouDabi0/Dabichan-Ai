const fs = require("fs");

let isBroadcasting = false;
const delayTime = 5 * 60 * 1000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  name: 'bcgc',
  command: ['bcgc', 'broadcastgc'],
  tags: 'Owner Menu',
  desc: 'Mengirim pesan broadcast ke semua grup (hanya untuk owner).',

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

    const withoutPrefix = textMessage.slice(prefix.length).trim();
    const firstSpaceIndex = withoutPrefix.indexOf(' ');
    const commandText = firstSpaceIndex !== -1 ? withoutPrefix.slice(0, firstSpaceIndex).toLowerCase() : withoutPrefix.toLowerCase();

    if (!module.exports.command.includes(commandText)) return;

    if (!global.isPremium(senderId)) {
      return conn.sendMessage(chatId, { text: '❌ Fitur ini hanya untuk pengguna premium!' }, { quoted: message });
    }

    const broadcastMessage = firstSpaceIndex !== -1 ? withoutPrefix.slice(firstSpaceIndex + 1) : '';

    if (!broadcastMessage) {
      return conn.sendMessage(chatId, { text: `❌ Pesan broadcast tidak boleh kosong! Gunakan format:\n\`${prefix}bcgc [pesan]\`` }, { quoted: message });
    }

    if (isBroadcasting) {
      return conn.sendMessage(chatId, { text: "⏳ Harap tunggu! Anda harus menunggu sebelum menjalankan perintah ini lagi." }, { quoted: message });
    }

    const groups = await conn.groupFetchAllParticipating();
    const groupIds = Object.keys(groups);
    if (groupIds.length === 0) {
      return conn.sendMessage(chatId, { text: "❌ Bot tidak tergabung dalam grup mana pun." }, { quoted: message });
    }

    isBroadcasting = true;
    conn.sendMessage(chatId, { text: `📢 Mengirim broadcast ke ${groupIds.length} grup...` }, { quoted: message });

    let success = 0, failed = 0;
    let failedGroups = [];

    for (const id of groupIds) {
      try {
        await conn.sendMessage(id, {
          text: `${broadcastMessage}`,
          contextInfo: {
            externalAdReply: {
              title: '📢 B R O A D C A S T',
              thumbnailUrl: thumbnail,
              sourceUrl: 'https://github.com/maoudabi0',
              mediaUrl: 'https://wa.me/6285725892962?text=Beli+Kak',
              mediaType: 1,
              renderLargerThumbnail: true,
              showAdAttribution: true
            },
            forwardingScore: 0,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363310100263711@newsletter'
            }
          }
        }, { quoted: message });

        success++;
      } catch {
        failed++;
        failedGroups.push(`- ${groups[id]?.subject || "Unknown"} (${id})`);
      }

      await delay(3000);
    }

    let resultText = `✅ Broadcast selesai!\n\n📤 Berhasil: ${success} grup\n❌ Gagal: ${failed} grup`;

    if (failedGroups.length > 0) {
      resultText += `\n\n*Daftar Grup Gagal:*\n${failedGroups.join("\n")}`;
    }

    conn.sendMessage(chatId, { text: resultText }, { quoted: message });

    setTimeout(() => {
      isBroadcasting = false;
      conn.sendMessage(chatId, { text: "✅ Perintah broadcast sekarang bisa digunakan lagi." }, { quoted: message });
    }, delayTime);
  }
};