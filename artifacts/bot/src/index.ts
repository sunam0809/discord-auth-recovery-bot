import {
  Client,
  GatewayIntentBits,
  Events,
  type ChatInputCommandInteraction,
} from "discord.js";
import { handle인증창 } from "./commands/인증창.js";
import { handle복구키만들기 } from "./commands/복구키만들기.js";
import { handle복구키사용 } from "./commands/복구키사용.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, c => {
  console.log(`✅ 봇 로그인 완료: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction as ChatInputCommandInteraction;

  try {
    switch (cmd.commandName) {
      case "인증창":
        await handle인증창(cmd);
        break;
      case "복구키만들기":
        await handle복구키만들기(cmd);
        break;
      case "복구키사용":
        await handle복구키사용(cmd);
        break;
    }
  } catch (err) {
    console.error(`명령어 오류 [${cmd.commandName}]:`, err);
    const msg = { content: "❌ 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", ephemeral: true };
    if (cmd.replied || cmd.deferred) {
      await cmd.editReply(msg).catch(() => {});
    } else {
      await cmd.reply(msg).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
