const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config();

const root = path.resolve(__dirname, "..");
const rawConfig = JSON.parse(
  fs.readFileSync(path.join(root, "config.json"), "utf8")
);

function csv(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  root,
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  ownerIds: csv(process.env.OWNER_IDS),
  databaseFile: path.resolve(root, rawConfig.databaseFile),
  defaultSettings: rawConfig.defaultSettings
};