module.exports = {
  name: 'cekcantik',
  command: ['cekcantik'],
  tags: 'Fun Menu',
  desc: 'Cek seberapa cantik seseorang',

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
      komentar = 'Cantik juga kamu';
    } else if (persentase <= 88) {
      komentar = 'Wah cantik banget';
    } else {
      komentar = 'Calon Miss Universe!';
    }

    const mentionTarget = targetId;

    const teks = `*Seberapa cantik @${mentionTarget}*\n\n*${persentase}%* Cantik\n_${komentar}_`;

    await conn.sendMessage(chatId, {
      text: teks,
      mentions: [`${targetId}@s.whatsapp.net`]
    }, { quoted: message });
  }
};