import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db, schema } from "../db.js";
import { eq } from "drizzle-orm";

const OWNER_ID = "1368030640628301865";

export async function handle복구키사용(interaction: ChatInputCommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    await interaction.reply({
      content: "❌ 이 명령어는 봇 소유자만 사용할 수 있습니다.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const key = interaction.options.getString("키", true).trim();
  const targetGuildId = interaction.guildId!;

  // 키 조회
  const [recoveryKey] = await db
    .select()
    .from(schema.recoveryKeysTable)
    .where(eq(schema.recoveryKeysTable.key, key));

  if (!recoveryKey) {
    await interaction.editReply({ content: "❌ 유효하지 않은 복구키입니다." });
    return;
  }

  if (recoveryKey.used) {
    await interaction.editReply({ content: "❌ 이미 사용된 복구키입니다." });
    return;
  }

  // 소스 서버의 인증된 유저 목록 가져오기
  const verifiedUsers = await db
    .select()
    .from(schema.verifiedUsersTable)
    .where(eq(schema.verifiedUsersTable.guildId, recoveryKey.sourceGuildId));

  if (verifiedUsers.length === 0) {
    await interaction.editReply({
      content: "⚠️ 복구할 인증된 멤버가 없습니다.",
    });
    return;
  }

  // 키 사용 처리
  await db
    .update(schema.recoveryKeysTable)
    .set({ used: true, usedAt: new Date(), targetGuildId })
    .where(eq(schema.recoveryKeysTable.key, key));

  // 타겟 서버 설정 가져오기
  const [targetGuild] = await db
    .select()
    .from(schema.guildsTable)
    .where(eq(schema.guildsTable.id, targetGuildId));

  const guild = interaction.guild!;
  const roleId = targetGuild?.verifyRoleId;

  let successCount = 0;
  let failCount = 0;

  const progressEmbed = new EmbedBuilder()
    .setTitle("⏳ 복구 진행 중...")
    .setDescription(`총 ${verifiedUsers.length}명의 멤버를 초대하는 중...`)
    .setColor(0x3498db);

  await interaction.editReply({ embeds: [progressEmbed] });

  for (const user of verifiedUsers) {
    try {
      // Discord API로 서버에 멤버 추가 (access token 사용)
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${targetGuildId}/members/${user.discordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: user.accessToken,
            roles: roleId ? [roleId] : [],
          }),
        }
      );

      if (res.ok || res.status === 204) {
        successCount++;

        // 타겟 서버 DB에도 인증 기록 저장
        await db
          .insert(schema.verifiedUsersTable)
          .values({
            guildId: targetGuildId,
            discordId: user.discordId,
            discordUsername: user.discordUsername,
            discordAvatar: user.discordAvatar,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
          })
          .onConflictDoNothing();
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }

    // 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 500));
  }

  const resultEmbed = new EmbedBuilder()
    .setTitle("✅ 복구 완료")
    .addFields(
      { name: "✅ 성공", value: `${successCount}명`, inline: true },
      { name: "❌ 실패", value: `${failCount}명`, inline: true },
      { name: "📊 총계", value: `${verifiedUsers.length}명`, inline: true }
    )
    .setColor(0x2ecc71)
    .setTimestamp();

  await interaction.editReply({ embeds: [resultEmbed] });
}
