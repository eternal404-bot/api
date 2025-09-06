// index.js
import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// 1️⃣ Minecraft 서버 상태 확인
app.post("/mcstatus", async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "서버 주소를 입력하세요." });

  try {
    const response = await fetch(`https://api.mcsrvstat.us/2/${address}`);
    const data = await response.json();

    if (!data.online) return res.status(404).json({ error: "서버가 꺼져 있거나 찾을 수 없습니다." });

    const embed = {
      embeds: [{
        title: `🟢 Minecraft 서버 상태`,
        color: 0x2ecc71,
        fields: [
          { name: "서버 주소", value: address, inline: true },
          { name: "온라인 여부", value: "✅ 온라인", inline: true },
          { name: "플레이어 수", value: `${data.players?.online || 0} / ${data.players?.max || 0}`, inline: true },
          { name: "MOTD", value: data.motd?.clean?.join("\n") || "없음" }
        ],
        footer: { text: "⚡ Data by mcsrvstat.us" }
      }]
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed)
    });

    res.json({ success: true, message: "Minecraft 서버 상태가 Discord로 전송됨" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Minecraft 상태 확인 오류" });
  }
});

// 2️⃣ Who-Data API 기반 도메인/IP 분석
app.post("/whois", async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: "도메인 또는 IP를 입력하세요." });

  try {
    const response = await fetch(`https://who-dat.as93.net/${target}`);
    const data = await response.json();

    const embed = {
      embeds: [{
        title: `🔍 WHOIS 조회: ${target}`,
        color: 0x3498db,
        fields: [
          { name: "도메인", value: data.domain || target, inline: true },
          { name: "등록자", value: data.registrant || "N/A", inline: true },
          { name: "등록일", value: data.registered || "N/A", inline: true },
          { name: "만료일", value: data.expires || "N/A", inline: true },
          { name: "네임서버", value: data.nameservers?.join("\n") || "N/A" }
        ],
        footer: { text: "⚡ Data by Who-Data API" }
      }]
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed)
    });

    res.json({ success: true, message: "WHOIS 분석 결과가 Discord로 전송됨" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "WHOIS 분석 오류" });
  }
});

// 3️⃣ 기본 페이지 - 버튼 UI
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>API 선택 도구</title>
        <style>
          body { background:black; color:white; font-family:sans-serif; text-align:center; padding-top:50px; }
          .card { background:#1e1e1e; border-radius:15px; padding:20px; width:400px; margin:20px auto; box-shadow:0 0 15px rgba(0,0,0,0.6); }
          input, button { padding:10px; margin:5px; border-radius:5px; border:none; }
          input { width:70%; }
          button { background:#3498db; color:white; cursor:pointer; }
          button:hover { background:#2980b9; }
        </style>
      </head>
      <body>
        <h1>⚡ API 선택 실행기</h1>

        <div class="card">
          <h2>🟢 Minecraft 서버 상태</h2>
          <input id="mcAddress" placeholder="예: play.hypixel.net"/>
          <button onclick="mcStatus()">Minecraft 확인</button>
          <p id="mcResult"></p>
        </div>

        <div class="card">
          <h2>🔍 WHOIS 조회 (Who-Data)</h2>
          <input id="domainTarget" placeholder="예: example.com"/>
          <button onclick="whoisCheck()">WHOIS 분석</button>
          <p id="whoisResult"></p>
        </div>

        <script>
          async function mcStatus() {
            const address = document.getElementById("mcAddress").value;
            const res = await fetch("/mcstatus", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address })
            });
            const data = await res.json();
            document.getElementById("mcResult").innerText = data.message || data.error;
          }

          async function whoisCheck() {
            const target = document.getElementById("domainTarget").value;
            const res = await fetch("/whois", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target })
            });
            const data = await res.json();
            document.getElementById("whoisResult").innerText = data.message || data.error;
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
