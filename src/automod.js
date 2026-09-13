const storage = require("./storage");
const { isExempt, safeName } = require("./utils");

const messageHistory = new Map();

function historyKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function cleanupHistory(key, now, interval) {
  const messages = messageHistory.get(key) || [];
  const valid = messages.filter((time) => now - time <= interval);
  messageHistory.set(key, valid);
  return valid;
}

async function punishMessage(message, reason, action = "delete") {
  try {
    if (message.deletable) await message.delete();
  } catch (error) {
    console.error("[AUTOMOD] Mesaj silinemedi:", error.message);
  }

  if (action === "timeout" && message.member?.moderatable) {
    try {
      await message.member.timeout(5 * 60 * 1000, reason);
    } catch (error) {
      console.error("[AUTOMOD] Timeout verilemedi:", error.message);
    }
  }

  console.log(
    `[AUTOMOD] ${safeName(message.author)} engellendi: ${reason} (${message.guild.name})`
  );
}

function hasBlockedWord(content, blockedWords) {
  const normalized = content.toLocaleLowerCase("tr-TR");
  return blockedWords.some((word) => {
    const clean = String(word).trim().toLocaleLowerCase("tr-TR");
    return clean && normalized.includes(clean);
  });
}

function normalizeDomain(domain) {
  return String(domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "");
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot || !message.member) return;

  const settings = storage.get(message.guild.id);
  if (isExempt(message.member, settings)) return;

  if (settings.automod.enabled && hasBlockedWord(message.content, settings.automod.blockedWords)) {
    return punishMessage(message, "Yasaklı kelime", "delete");
  }

  if (settings.antiLink.enabled) {
    const urls =
      message.content.match(
        /(?:https?:\/\/|www\.)[^\s]+|(?:discord\.gg|discordapp\.com\/invite)\/[^\s]+/gi
      ) || [];
    const allowedDomains = settings.antiLink.allowedDomains.map(normalizeDomain);
    const blockedUrl = urls.find((url) => {
      try {
        const hostname = normalizeDomain(
          new URL(url.startsWith("www.") ? `https://${url}` : url).hostname
        );
        return !allowedDomains.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
        );
      } catch {
        return true;
      }
    });
    if (blockedUrl) {
      return punishMessage(message, "İzinsiz bağlantı", settings.antiLink.action);
    }
  }

  if (
    settings.antiMention.enabled &&
    message.mentions.users.size + message.mentions.roles.size >
      settings.antiMention.maxMentions
  ) {
    return punishMessage(message, "Toplu mention", settings.antiMention.action);
  }

  if (settings.antiSpam.enabled) {
    const now = Date.now();
    const key = historyKey(message.guild.id, message.author.id);
    const messages = cleanupHistory(
      key,
      now,
      settings.antiSpam.intervalSeconds * 1000
    );
    messages.push(now);
    if (messages.length >= settings.antiSpam.maxMessages) {
      messageHistory.delete(key);
      try {
        if (message.member.moderatable) {
          await message.member.timeout(
            settings.antiSpam.timeoutMinutes * 60 * 1000,
            "Guard anti-spam"
          );
        }
      } catch (error) {
        console.error("[AUTOMOD] Spam timeout basarisiz:", error.message);
      }
      return punishMessage(message, "Spam", "delete");
    }
  }
}

function clearUserHistory(guildId, userId) {
  messageHistory.delete(historyKey(guildId, userId));
}

module.exports = { handleMessage, clearUserHistory };