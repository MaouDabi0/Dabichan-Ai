const fetch = require('node-fetch');

module.exports = {
  name: 'gitclone',
  command: ['git', 'gitclone'],
  tags: 'Download Menu',
  desc: 'Download repository GitHub dalam bentuk .zip',

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
      return conn.sendMessage(chatId, { text: `Where is the link?\nExample:\n${prefix}git https://github.com/DGXeon/XeonMedia` }, { quoted: message });
    }

    if (!/^https?:\/\//.test(text) || !text.includes('github.com')) {
      return conn.sendMessage(chatId, { text: `Link invalid!!` }, { quoted: message });
    }

    await conn.sendMessage(chatId, { react: { text: '📦', key: message.key } });

    try {
      let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
      let [, user, repo] = text.match(regex) || [];
      if (!user || !repo) {
        return conn.sendMessage(chatId, { text: 'Invalid GitHub link.' }, { quoted: message });
      }

      repo = repo.replace(/.git$/, '');
      let url = `https://api.github.com/repos/${user}/${repo}/zipball`;
      let head = await fetch(url, { method: 'HEAD' });
      let disposition = head.headers.get('content-disposition');
      if (!disposition) {
        return conn.sendMessage(chatId, { text: 'Failed to get file info.' }, { quoted: message });
      }
      
      let filename = disposition.match(/attachment; filename=(.*)/)[1];

      await conn.sendMessage(chatId, {
        document: { url: url },
        fileName: filename + '.zip',
        mimetype: 'application/zip'
      }, { quoted: message });

    } catch (e) {
      console.error(e);
      await conn.sendMessage(chatId, { text: 'Terjadi kesalahan saat mendownload repository.' }, { quoted: message });
    }
  }
};