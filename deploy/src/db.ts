import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import pg from "pg";

const { Pool } = pg;

export const guildsTable = pgTable("guilds", {
  id: text("id").primaryKey(),
  verifyRoleId: text("verify_role_id"),
  logWebhookUrl: text("log_webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifiedUsersTable = pgTable("verified_users", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  discordAvatar: text("discord_avatar"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
});

export const recoveryKeysTable = pgTable("recovery_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  sourceGuildId: text("source_guild_id").notNull(),
  targetGuildId: text("target_guild_id"),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, {
  schema: { guildsTable, verifiedUsersTable, recoveryKeysTable },
});
