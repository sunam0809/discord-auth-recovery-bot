import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Discord 인증 시스템</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;color:#fff;font-family:'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
background-image:radial-gradient(ellipse at 20% 50%,rgba(88,101,242,.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,123,255,.12) 0%,transparent 50%)}
.container{text-align:center;max-width:600px;padding:40px 24px;animation:fadeIn .6s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.logo{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:40px}
.logo svg{width:48px;height:48px;fill:#5865f2;filter:drop-shadow(0 0 12px rgba(88,101,242,.8))}
.logo-text{font-size:22px;font-weight:700}
h1{font-size:42px;font-weight:800;margin-bottom:16px;background:linear-gradient(135deg,#fff 0%,#00d4ff 50%,#5865f2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.2}
.subtitle{font-size:16px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:48px}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px}
.feature{background:rgba(255,255,255,.04);border:1px solid rgba(88,101,242,.2);border-radius:12px;padding:20px 16px}
.feature-icon{font-size:28px;margin-bottom:8px}
.feature-title{font-size:13px;font-weight:600;margin-bottom:4px}
.feature-desc{font-size:11px;color:rgba(255,255,255,.45);line-height:1.5}
.status{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:rgba(0,212,100,.1);border:1px solid rgba(0,212,100,.3);border-radius:24px;font-size:13px;color:#00d464;font-weight:500}
.dot{width:8px;height:8px;background:#00d464;border-radius:50%;box-shadow:0 0 8px rgba(0,212,100,.8);animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.8)}}
@media(max-width:480px){.features{grid-template-columns:1fr}h1{font-size:30px}}
</style></head>
<body><div class="container">
<div class="logo">
<svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.053a19.89 19.89 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
<span class="logo-text">Discord 인증 시스템</span></div>
<h1>안전하고 빠른<br/>서버 인증</h1>
<p class="subtitle">Discord OAuth2를 통한 안전한 멤버 인증과<br/>서버 간 멤버 복구 기능을 제공합니다.</p>
<div class="features">
<div class="feature"><div class="feature-icon">🔐</div><div class="feature-title">OAuth2 인증</div><div class="feature-desc">Discord 공식 OAuth2로 안전하게 인증</div></div>
<div class="feature"><div class="feature-icon">🔑</div><div class="feature-title">복구키 시스템</div><div class="feature-desc">인증된 멤버를 새 서버로 즉시 이전</div></div>
<div class="feature"><div class="feature-icon">📊</div><div class="feature-title">실시간 로그</div><div class="feature-desc">웹훅으로 인증 현황 실시간 알림</div></div>
</div>
<div class="status"><div class="dot"></div>시스템 정상 운영 중</div>
</div></body></html>`);
});

app.use(authRouter);

const port = parseInt(process.env.PORT ?? "3000");
app.listen(port, () => console.log(`서버 실행 중: port ${port}`));
