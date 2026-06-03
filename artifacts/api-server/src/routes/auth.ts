import { Router } from "express";
import { db } from "../lib/db.js";
import {
  guildsTable,
  verifiedUsersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const BASE_URL = process.env.BASE_URL ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
const REDIRECT_URI = `${BASE_URL}/api/auth/callback`;

// Step 1: Discord OAuth 시작 — 인증 버튼 클릭 시
router.get("/auth/discord", (req, res) => {
  const guildId = req.query.guild_id as string;
  if (!guildId) {
    res.status(400).send("guild_id가 필요합니다.");
    return;
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds.join",
    state: guildId,
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

// Step 2: Discord OAuth 콜백
router.get("/auth/callback", async (req, res) => {
  const code = req.query.code as string;
  const guildId = req.query.state as string;

  if (!code || !guildId) {
    res.redirect(`/api/auth/result?status=error&msg=잘못된+요청`);
    return;
  }

  try {
    // 토큰 교환
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      res.redirect(`/api/auth/result?status=error&msg=토큰+교환+실패`);
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // 유저 정보 가져오기
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.redirect(`/api/auth/result?status=error&msg=유저+정보+조회+실패`);
      return;
    }

    const userData = (await userRes.json()) as {
      id: string;
      username: string;
      avatar: string | null;
    };

    // 서버 설정 확인
    const [guild] = await db
      .select()
      .from(guildsTable)
      .where(eq(guildsTable.id, guildId));

    if (!guild) {
      res.redirect(`/api/auth/result?status=error&msg=서버+설정이+없습니다`);
      return;
    }

    // 이미 인증된 유저인지 확인
    const [existing] = await db
      .select()
      .from(verifiedUsersTable)
      .where(
        and(
          eq(verifiedUsersTable.guildId, guildId),
          eq(verifiedUsersTable.discordId, userData.id)
        )
      );

    if (existing) {
      // 토큰 갱신
      await db
        .update(verifiedUsersTable)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          discordUsername: userData.username,
          discordAvatar: userData.avatar,
        })
        .where(
          and(
            eq(verifiedUsersTable.guildId, guildId),
            eq(verifiedUsersTable.discordId, userData.id)
          )
        );
    } else {
      // 새 인증 기록 저장
      await db.insert(verifiedUsersTable).values({
        guildId,
        discordId: userData.id,
        discordUsername: userData.username,
        discordAvatar: userData.avatar,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      });
    }

    // 서버에 멤버 추가 + 역할 부여
    if (guild.verifyRoleId) {
      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userData.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: tokenData.access_token,
            roles: [guild.verifyRoleId],
          }),
        }
      );
    }

    // 웹훅 로그 전송
    if (guild.logWebhookUrl) {
      const avatarUrl = userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

      await fetch(guild.logWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "✅ 새 인증 완료",
              color: 0x5865f2,
              thumbnail: { url: avatarUrl },
              fields: [
                { name: "유저", value: `<@${userData.id}> (${userData.username})`, inline: true },
                { name: "ID", value: userData.id, inline: true },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    }

    res.redirect(
      `/api/auth/result?status=success&username=${encodeURIComponent(userData.username)}&avatar=${encodeURIComponent(userData.avatar ?? "")}&id=${userData.id}`
    );
  } catch (err) {
    console.error("OAuth 오류:", err);
    res.redirect(`/api/auth/result?status=error&msg=서버+오류`);
  }
});

// Step 3: 결과 페이지 (HTML)
router.get("/auth/result", (req, res) => {
  const status = req.query.status as string;
  const username = req.query.username as string;
  const avatar = req.query.avatar as string;
  const id = req.query.id as string;
  const msg = req.query.msg as string;

  const isSuccess = status === "success";
  const avatarUrl = avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? "인증 완료" : "인증 실패"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      color: #ffffff;
      font-family: 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: radial-gradient(ellipse at 20% 50%, rgba(88,101,242,0.15) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(0,123,255,0.1) 0%, transparent 50%);
    }
    .card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(88,101,242,0.3);
      border-radius: 16px;
      padding: 48px 40px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      backdrop-filter: blur(12px);
      box-shadow: 0 0 40px rgba(88,101,242,0.2), 0 20px 60px rgba(0,0,0,0.5);
      animation: fadeIn 0.4s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .icon { font-size: 56px; margin-bottom: 16px; }
    .avatar {
      width: 80px; height: 80px;
      border-radius: 50%;
      border: 3px solid #5865f2;
      margin: 0 auto 16px;
      box-shadow: 0 0 20px rgba(88,101,242,0.6);
      display: block;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: ${isSuccess ? "#00d4ff" : "#ff4757"};
      text-shadow: 0 0 20px ${isSuccess ? "rgba(0,212,255,0.5)" : "rgba(255,71,87,0.5)"};
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .username {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 24px;
      ${isSuccess
        ? "background: rgba(0,212,255,0.15); color: #00d4ff; border: 1px solid rgba(0,212,255,0.3);"
        : "background: rgba(255,71,87,0.15); color: #ff4757; border: 1px solid rgba(255,71,87,0.3);"}
    }
    .close-btn {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #5865f2, #3b82f6);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(88,101,242,0.4);
      transition: all 0.2s;
    }
    .close-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(88,101,242,0.6);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
      opacity: 0.7;
    }
    .logo svg { width: 24px; height: 24px; fill: #5865f2; }
    .logo span { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.053a19.89 19.89 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
      </svg>
      <span>Discord 인증 시스템</span>
    </div>

    ${isSuccess ? `
      <img class="avatar" src="${avatarUrl}" alt="avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'" />
      <div class="username">${username}</div>
      <div class="badge">✅ 인증 완료</div>
      <h1>인증에 성공했습니다!</h1>
      <p class="subtitle">이제 Discord 서버로 돌아가세요.<br>역할이 자동으로 부여되었습니다.</p>
    ` : `
      <div class="icon">❌</div>
      <div class="badge">인증 실패</div>
      <h1>인증에 실패했습니다</h1>
      <p class="subtitle">${msg ?? "알 수 없는 오류가 발생했습니다."}<br>다시 시도해 주세요.</p>
    `}

    <a href="javascript:window.close()" class="close-btn">창 닫기</a>
  </div>
</body>
</html>`);
});

export default router;
