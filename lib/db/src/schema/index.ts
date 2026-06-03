import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildsTable = pgTable("guilds", {
  id: text("id").primaryKey(),
  verifyRoleId: text("verify_role_id"),
  logWebhookUrl: text("log_webhook_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifiedUsersTable = pgTable("verified_users", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().references(() => guildsTable.id),
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
  sourceGuildId: text("source_guild_id").notNull().references(() => guildsTable.id),
  targetGuildId: text("target_guild_id"),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
});

export const insertGuildSchema = createInsertSchema(guildsTable);
export const insertVerifiedUserSchema = createInsertSchema(verifiedUsersTable).omit({ id: true });
export const insertRecoveryKeySchema = createInsertSchema(recoveryKeysTable).omit({ id: true });

export type Guild = typeof guildsTable.$inferSelect;
export type InsertGuild = z.infer<typeof insertGuildSchema>;
export type VerifiedUser = typeof verifiedUsersTable.$inferSelect;
export type InsertVerifiedUser = z.infer<typeof insertVerifiedUserSchema>;
export type RecoveryKey = typeof recoveryKeysTable.$inferSelect;
export type InsertRecoveryKey = z.infer<typeof insertRecoveryKeySchema>;
