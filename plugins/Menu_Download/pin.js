const fetch = require('node-fetch');

module.exports = {
  name: 'pinterest',
  command: ['pin', 'pinterest'],
  tags: 'Download Menu',
  desc: 'Mencari gambar Pinterest berdasarkan kata kunci',

  run: async (conn, message, { isPrefix }) => {
    const chatId = message?.key?.remoteJid;
    const textMessage =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    if (!textMessage) return;

    const prefix = isPrefix.find((p) => textMessage.startsWith(p));
    if (!prefix) return;

    const args = textMessage.slice(prefix.length).trim().split(/\s+/);
    const commandText = args.shift().toLowerCase();
    if (!module.exports.command.includes(commandText)) return;

    const text = args.join(' ');
    if (!text) {
      return conn.sendMessage(chatId, { text: `Contoh: ${prefix}pin christy jkt48` }, { quoted: message });
    }

    await conn.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

    try {
      const fetchJson = async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed ${res.status}`);
        return res.json();
      };

      const data = await fetchJson(`https://www.archive-ui.biz.id/search/pinterest?q=${encodeURIComponent(text)}`);
      if (!data.result || data.result.length === 0) {
        return conn.sendMessage(chatId, { text: 'Gambar tidak ditemukan.' }, { quoted: message });
      }

      let index = isNaN(args[1]) ? 0 : parseInt(args[1]);
      if (index >= data.result.length) {
        return conn.sendMessage(chatId, { text: 'Sudah mencapai gambar terakhir.' }, { quoted: message });
      }

      let hasil = data.result[index].image_hd;

      await conn.sendMessage(chatId, {
        image: { url: hasil },
        caption: `Menampilkan gambar ke *${index + 1}* dari *${data.result.length}*.`,
        footer: '',
        headerType: 4
      }, { quoted: message });

    } catch (err) {
      console.error(err);
      await conn.sendMessage(chatId, { text: 'Terjadi kesalahan saat mengambil gambar.' }, { quoted: message });
    }
  }
};