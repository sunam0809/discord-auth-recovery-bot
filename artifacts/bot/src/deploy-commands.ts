import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const commands = [
  new SlashCommandBuilder()
    .setName("인증창")
    .setDescription("이 채널에 인증 패널을 생성합니다")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option
        .setName("역할")
        .setDescription("인증 성공 시 부여할 역할")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("웹훅")
        .setDescription("인증 로그를 받을 웹훅 URL")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("복구키만들기")
    .setDescription("이 서버의 인증된 멤버를 이전할 1회용 복구키를 생성합니다")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("복구키사용")
    .setDescription("복구키를 사용하여 다른 서버의 인증된 멤버를 이 서버로 가져옵니다")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("키")
        .setDescription("복구키 입력")
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log("슬래시 명령어를 등록하는 중...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("슬래시 명령어 등록 완료!");
  } catch (err) {
    console.error(err);
  }
})();
