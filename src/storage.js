const fs = require("node:fs");
const path = require("node:path");
const config = require("./config");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, extra) {
  if (!extra || typeof extra !== "object") return base;
  for (const [key, value] of Object.entries(extra)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merge(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

class Storage {
  constructor(file) {
    this.file = file;
    this.data = { guilds: {} };
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!fs.existsSync(this.file)) {
      this.save();
      return;
    }

    try {
      this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (!this.data.guilds) this.data.guilds = {};
    } catch (error) {
      console.error("[STORAGE] Veritabani okunamadi, yeni dosya kullaniliyor:", error.message);
      this.data = { guilds: {} };
      this.save();
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), "utf8");
  }

  get(guildId) {
    const settings = merge(clone(config.defaultSettings), this.data.guilds[guildId]);
    this.data.guilds[guildId] = settings;
    return settings;
  }

  update(guildId, updater) {
    const settings = this.get(guildId);
    updater(settings);
    this.data.guilds[guildId] = settings;
    this.save();
    return settings;
  }
}

module.exports = new Storage(config.databaseFile);