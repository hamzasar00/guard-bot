const assert = require("node:assert/strict");
const { commandData } = require("../src/commands");
const storage = require("../src/storage");
const { handleMessage } = require("../src/automod");
const { AuditLogEvent } = require("discord.js");

async function main() {
  assert.equal(commandData.length, 1);
  assert.equal(commandData[0].name, "guard");
  assert.equal(AuditLogEvent.MemberBanAdd, 22);
  assert.equal(AuditLogEvent.MemberKick, 20);

  const guildId = `smoke-${Date.now()}`;
  storage.update(guildId, (settings) => {
    settings.antiLink.enabled = false;
    settings.antiMention.enabled = false;
    settings.antiSpam.enabled = false;
    settings.automod.enabled = true;
    settings.automod.blockedWords = ["yasak"];
  });

  let deleted = 0;
  await handleMessage({
    guild: { id: guildId, name: "Smoke Guild" },
    author: { bot: false, id: "smoke-user", username: "smoke-user" },
    member: {
      permissions: { has: () => false },
      moderatable: true
    },
    content: "bu yasak içerik",
    deletable: true,
    delete: async () => {
      deleted += 1;
    },
    mentions: {
      users: { size: 0 },
      roles: { size: 0 }
    }
  });

  assert.equal(deleted, 1);
  console.log("Smoke testleri başarılı.");
}

main().catch((error) => {
  console.error("Smoke test başarısız:", error);
  process.exitCode = 1;
});