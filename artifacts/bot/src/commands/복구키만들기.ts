import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db, schema } from "../db.js";
import { randomBytes } from "crypto";

const OWNER_ID = "1368030640628301865";

export async function handle복구키만들기(interaction: ChatInputCommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    await interaction.reply({
      content: "❌ 이 명령어는 봇 소유자만 사용할 수 있습니다.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;

  // 서버가 DB에 없으면 생성
  await db
    .insert(schema.guildsTable)
    .values({ id: guildId })
    .onConflictDoNothing();

  const key = randomBytes(16).toString("hex").toUpperCase();

  await db.insert(schema.recoveryKeysTable).values({
    key,
    sourceGuildId: guildId,
    used: false,
  });

  const embed = new EmbedBuilder()
    .setTitle("🔑 복구키 생성 완료")
    .setDescription(
      `아래 키를 복사하여 **새 서버**에서 \`/복구키사용\` 명령어로 사용하세요.\n\n\`\`\`${key}\`\`\`\n\n⚠️ 이 키는 **1회용**이며 이 메시지 외에서는 다시 확인할 수 없습니다.`
    )
    .setColor(0xf1c40f)
    .setFooter({ text: "키를 안전한 곳에 보관하세요." });

  await interaction.editReply({ embeds: [embed] });
}
