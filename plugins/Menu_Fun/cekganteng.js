module.exports = {
  name: 'cekganteng',
  command: ['cekganteng'],
  tags: 'Fun Menu',
  desc: 'Cek seberapa ganteng seseorang',

  run: async (conn, message, { isPrefix }) => {
    const chatId = message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const senderId = isGroup ? message.key.participant : message.key.remoteJid;
    const textMessage = message.message?.conversation || message.message?.extendedTextMessage?.text || '';

    if (!textMessage) return;

    const prefix = isPrefix.find((p) => textMessage.startsWith(p));
    if (!prefix) return;

    const args = textMessage.slice(prefix.length).trim().split(/\s+/);
    const commandText = args.shift().toLowerCase();
    if (!module.exports.command.includes(commandText)) return;

    let targetId = target(message, senderId);

    const persentase = Math.floor(Math.random() * 101);

    let komentar;
    if (persentase <= 25) {
      komentar = 'Masih biasa aja';
    } else if (persentase <= 44) {
      komentar = 'Lumayan lah';
    } else if (persentase <= 72) {
      komentar = 'Ganteng juga kamu';
    } else if (persentase <= 88) {
      komentar = 'Wah ganteng banget';
    } else {
      komentar = 'Calon Oppa Korea!';
    }

    const mentionTarget = targetId;

    const teks = `*Seberapa ganteng @${mentionTarget}*\n\n*${persentase}%* Ganteng\n_${komentar}_`;

    await conn.sendMessage(chatId, {
      text: teks,
      mentions: [`${targetId}@s.whatsapp.net`]
    }, { quoted: message });
  }
};