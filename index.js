
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());
app.use(cors());

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// 루트 페이지 HTML (검은색 배경 + 카드 애니메이션)
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <title>Minecraft server</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #121212;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        overflow: hidden;
      }
      /* 카드 애니메이션 */
      .card {
        background: #1e1e1e;
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.5);
        text-align: center;
        width: 320px;
        opacity: 0;
        transform: translateY(-50px);
        animation: fadeInUp 1s forwards;
      }
      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      h1 {
        color: #ffffff;
        font-size: 1.5em;
        margin-bottom: 20px;
      }
      input {
        width: 80%;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid #555;
        margin-bottom: 15px;
        font-size: 1em;
        background-color: #2a2a2a;
        color: #fff;
      }
      button {
        background: #4facfe;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 1em;
        transition: transform 0.2s, background 0.3s;
      }
      button:hover {
        transform: scale(1.05);
        background: #00f2fe;
      }
      #result {
        margin-top: 15px;
        font-weight: bold;
        color: #ffffff;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Minecraft server stat</h1>
      <input id="server" placeholder="server address" />
      <br/>
      <button onclick="sendServer()">Go</button>
      <p id="result"></p>
    </div>

    <script>
      async function sendServer() {
        const server = document.getElementById("server").value;
        if (!server) return alert("server address");

        const res = await fetch("/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ server })
        });

        const data = await res.json();
        document.getElementById("result").innerText = data.success
          ? "success!"
          : "error: " + data.error;
      }
    </script>
  </body>
  </html>
  `);
});

// POST /send 요청 처리 (Discord 임베드)
app.post("/send", async (req, res) => {
  const { server } = req.body;
  if (!server) return res.status(400).send({ success: false, error: "서버 주소 필요" });

  try {
    const apiUrl = `https://api.mcsrvstat.us/2/${server}`;
    const data = await fetch(apiUrl).then(r => r.json());

    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `server: ${server}`,
          description: data.online ? "online" : "offline",
          color: data.online ? 0x00ff00 : 0xff0000,
          fields: [
            { name: "접속자", value: `${data.players?.online || 0}/${data.players?.max || "?"}`, inline: true },
            { name: "버전", value: data.version || "알 수 없음", inline: true },
            { name: "MOTD", value: data.motd?.clean?.join("\n") || "없음", inline: false },
            { name: "플레이어 목록", value: data.players?.list?.map(p => p.name).join(", ") || "없음", inline: false },
            { name: "IP:PORT", value: `${data.ip}:${data.port}`, inline: true },
            { name: "서버 웹사이트", value: data.website || "없음", inline: false }
          ],
          thumbnail: { url: `https://api.mcsrvstat.us/icon/${server}` },
          timestamp: new Date()
        }]
      })
    });

    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
