const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// Render 환경변수에서 Discord 웹훅 URL 읽기
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// 루트 페이지에서 HTML 제공
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>Minecraft 서버 상태 전송</title>
    </head>
    <body>
      <h1>Minecraft 서버 상태 전송</h1>
      <input id="server" placeholder="서버 주소 입력" />
      <button onclick="sendServer()">전송</button>
      <p id="result"></p>

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
            : "오류 발생: " + data.error;
        }
      </script>
    </body>
    </html>
  `);
});

// POST /send 요청 처리
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
        content: `🎮 서버 주소: ${server}\n🌐 상태: ${data.online ? "온라인" : "오프라인"}\n👥 접속자: ${data.players?.online || 0}/${data.players?.max || "?"}`
      })
    });

    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: "오류 발생" });
  }
});

// Render 환경변수 PORT 사용
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
