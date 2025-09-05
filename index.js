const express = require("express");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json());
app.use(cors());

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// 루트 페이지 HTML
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <title>Minecraft 서버 상태 전송</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(to right, #4facfe, #00f2fe);
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        background: white;
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        text-align: center;
        width: 320px;
      }
      h1 {
        color: #333;
        font-size: 1.5em;
        margin-bottom: 20px;
      }
      input {
        width: 80%;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid #ccc;
        margin-bottom: 15px;
        font-size: 1em;
      }
      button {
        background: #4facfe;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 1em;
        transition: 0.3s;
      }
      button:hover {
        background: #00f2fe;
      }
      #result {
        margin-top: 15px;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Minecraft 서버 상태 전송</h1>
      <input id="server" placeholder="서버 주소 입력" />
      <br/>
      <button onclick="sendServer()">전송</button>
      <p id="result"></p>
    </div>
    <script>
      async function sendServer() {
        const server = document.getElementById("server").value;
        if (!server) return alert("서버 주소를 입력하세요.");

        const res = await fetch("/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ server })
        });

        const data = await res.json();
        document.getElementById("result").innerText = data.success
          ? "웹훅 전송 완료!"
          : "error404: " + data.error;
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
          description: data.online ? "온라인입니다!" : "오프라인입니다!",
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
