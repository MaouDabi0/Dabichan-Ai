const axios = require('axios');
const moment = require('moment-timezone');

module.exports = {
  name: 'weather',
  command: ['cuaca', 'cekcuaca', 'weather'],
  tags: 'Info Menu',
  desc: 'Melihat info cuaca di suatu lokasi.',

  run: async (conn, message, { isPrefix }) => {
    try {
      const chatId = message.key.remoteJid;
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
      const commandText = args.shift()?.toLowerCase();
      if (!module.exports.command.includes(commandText)) return;

      const text = args.join(' ');
      if (!text) {
        return conn.sendMessage(chatId, { 
          text: '🌍 Lokasi mana nih yang mau dicek cuacanya?\n\nContoh: .cuaca Jakarta'
        }, { quoted: message });
      }

      const apikey = '060a6bcfa19809c2cd4d97a212b19273';
      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&units=metric&appid=${apikey}&lang=id`);
      const data = res.data;

      const lokasi = `${data.name}, ${data.sys.country}`;
      const suhu = data.main.temp;
      const kondisi = data.weather[0].description;
      const angin = data.wind.speed;
      const kelembapan = data.main.humidity;
      const waktu = moment().tz('Asia/Jakarta');
      const date = waktu.format('DD MMM YYYY');
      const jam = waktu.format('HH.mm');

      let bagianHari = '';
      const hour = waktu.hour();

      if (hour >= 5 && hour < 11) {
        bagianHari = '🌅 Pagi';
      } else if (hour >= 11 && hour < 15) {
        bagianHari = '🌞 Siang';
      } else if (hour >= 15 && hour < 18) {
        bagianHari = '🌇 Sore';
      } else {
        bagianHari = '🌙 Malam';
      }

      let cuacaText = `${garis}\n`;
      cuacaText += `  ☀️  CUACA HARI INI  \n`;
      cuacaText += `${garis}\n`;
      cuacaText += ` ${lokasi}, ${date}\n\n`;
      cuacaText += `  🌡  ${suhu}°C ( ${kondisi} )\n`;
      cuacaText += `  └─ ${bagianHari}: ${suhu}°C\n\n`;
      cuacaText += `  🍃 Angin: ${angin} m/s\n`;
      cuacaText += `  💦 Kelembapan: ${kelembapan}%\n`;
      cuacaText += `${garis}`.trim();

      conn.sendMessage(chatId, { 
        text: cuacaText,
        contextInfo: {
          externalAdReply: {
            title: 'L A P O R A N - C U A C A',
            body: `Laporan Cuaca Di ${lokasi}`,
            thumbnailUrl: thumbnail,
            mediaType: 1,
            renderLargerThumbnail: true,
            showAdAttribution: true
          },
          mentionedJid: [senderId],
          forwardingScore: 0,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363310100263711@newsletter'
          }
        }
      }, { quoted: message });

    } catch (err) {
      console.error(err);
      conn.sendMessage(message.key.remoteJid, { text: '❌ Gagal mengambil data cuaca. Pastikan nama lokasinya benar!' }, { quoted: message });
    }
  }
};