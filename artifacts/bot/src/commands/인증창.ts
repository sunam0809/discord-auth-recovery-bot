import {
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { db, schema } from "../db.js";
import { eq } from "drizzle-orm";

export async function handle인증창(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const role = interaction.options.getRole("역할", true);
  const webhookUrl = interaction.options.getString("웹훅") ?? null;
  const guildId = interaction.guildId!;

  // 서버 설정 저장
  await db
    .insert(schema.guildsTable)
    .values({
      id: guildId,
      verifyRoleId: role.id,
      logWebhookUrl: webhookUrl,
    })
    .onConflictDoUpdate({
      target: schema.guildsTable.id,
      set: {
        verifyRoleId: role.id,
        logWebhookUrl: webhookUrl,
        updatedAt: new Date(),
      },
    });

  const baseUrl = process.env.BASE_URL ?? "https://your-app.onrender.com";

  const embed = new EmbedBuilder()
    .setTitle("🔐 서버 인증")
    .setDescription(
      "아래 버튼을 눌러 Discord 계정으로 인증해 주세요.\n인증 완료 시 역할이 자동으로 부여됩니다."
    )
    .setColor(0x5865f2)
    .setFooter({ text: "인증 후 역할이 자동으로 부여됩니다." });

  const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("인증하기")
      .setStyle(ButtonStyle.Link)
      .setURL(`${baseUrl}/api/auth/discord?guild_id=${guildId}`)
      .setEmoji("✅")
  );

  await interaction.channel!.send({ embeds: [embed], components: [button] });
  await interaction.editReply({ content: "✅ 인증 패널이 생성되었습니다!" });
}
