const { AuditLogEvent } = require("discord.js");
const storage = require("./storage");
const { isExempt, safeName } = require("./utils");
const { handleMessage } = require("./automod");

const joinHistory = new Map();
const auditHistory = new Map();

function recentItems(map, key, windowMs) {
  const now = Date.now();
  const items = (map.get(key) || []).filter((time) => now - time <= windowMs);
  map.set(key, items);
  return items;
}

async function punishRaidMember(member, settings) {
  try {
    if (settings.antiRaid.action === "kick" && member.kickable) {
      await member.kick("Guard anti-raid");
    } else if (member.moderatable) {
      await member.timeout(
        settings.antiRaid.lockdownMinutes * 60 * 1000,
        "Guard anti-raid"
      );
    }
  } catch (error) {
    console.error("[ANTI-RAID] Ceza uygulanamadi:", error.message);
  }
}

async function onMemberJoin(member) {
  const settings = storage.get(member.guild.id);
  const now = Date.now();
  const lockdownActive =
    settings.lockdownUntil && settings.lockdownUntil > now;

  if (!settings.antiRaid.enabled && !lockdownActive) return;

  const key = member.guild.id;
  const joins = recentItems(
    joinHistory,
    key,
    settings.antiRaid.windowSeconds * 1000
  );
  joins.push(now);

  if (isExempt(member, settings)) return;
  if (lockdownActive) {
    await punishRaidMember(member, settings);
    return;
  }

  if (joins.length >= settings.antiRaid.joinLimit) {
    storage.update(member.guild.id, (value) => {
      value.lockdownUntil = now + value.antiRaid.lockdownMinutes * 60 * 1000;
    });
    await punishRaidMember(member, settings);
    console.log(
      `[ANTI-RAID] ${member.guild.name} yeni katılım kilidine alındı: ${joins.length} yeni katılım`
    );
  }
}

function trackedAuditAction(action) {
  return [
    AuditLogEvent.ChannelCreate,
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.RoleCreate,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.RoleUpdate,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.MemberKick,
    AuditLogEvent.MemberRoleUpdate,
    AuditLogEvent.ChannelOverwriteCreate,
    AuditLogEvent.ChannelOverwriteUpdate,
    AuditLogEvent.ChannelOverwriteDelete,
    AuditLogEvent.WebhookCreate,
    AuditLogEvent.WebhookUpdate,
    AuditLogEvent.WebhookDelete,
    AuditLogEvent.BotAdd
  ].includes(action);
}

async function onAuditLog(entry, guild) {
  const settings = storage.get(guild.id);
  if (!settings.antiNuke.enabled || !trackedAuditAction(entry.action)) return;
  if (!entry.executor || entry.executor.bot) return;

  let member;
  try {
    member = await guild.members.fetch(entry.executor.id);
  } catch {
    return;
  }
  if (isExempt(member, settings)) return;

  const key = `${guild.id}:${entry.executor.id}`;
  const actions = recentItems(
    auditHistory,
    key,
    settings.antiNuke.windowSeconds * 1000
  );
  actions.push(Date.now());

  if (actions.length < settings.antiNuke.maxActions) return;

  let punished = false;
  try {
    if (settings.antiNuke.action === "ban" && member.bannable) {
      await member.ban({ reason: "Guard anti-nuke: çok sayıda kritik işlem" });
      punished = true;
    } else if (member.moderatable) {
      await member.timeout(60 * 60 * 1000, "Guard anti-nuke");
      punished = true;
    }
  } catch (error) {
    console.error("[ANTI-NUKE] Ceza uygulanamadi:", error.message);
  }

  console.log(punished
    ? `[ANTI-NUKE] ${guild.name}: ${safeName(entry.executor)} cezalandırıldı`
    : `[ANTI-NUKE] ${guild.name}: ${safeName(entry.executor)} için botun yetkisi yetersiz`);
  auditHistory.delete(key);
}

async function onReady(client) {
  console.log(`[READY] ${client.user.tag} olarak giriş yapıldı.`);
  console.log(`[READY] ${client.guilds.cache.size} sunucuda aktif.`);
  client.user.setPresence({ status: "dnd" });
}

function registerEvents(client) {
  client.on("messageCreate", handleMessage);
  client.on("guildMemberAdd", onMemberJoin);
  client.on("guildAuditLogEntryCreate", (entry, guild) => onAuditLog(entry, guild));
  client.on("guildCreate", (guild) => {
    console.log(`[GUILD] Yeni sunucu: ${guild.name} (${guild.id})`);
  });
  client.on("error", (error) => console.error("[CLIENT]", error));
}

module.exports = { registerEvents, onReady };