const {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const storage = require("./storage");
const { isStaff } = require("./utils");

const features = [
  ["antiRaid", "Anti-raid"],
  ["antiSpam", "Anti-spam"],
  ["antiLink", "Link koruması"],
  ["antiMention", "Mention koruması"],
  ["antiNuke", "Anti-nuke"],
  ["automod", "Kelime filtresi"]
];

const commandData = [
  new SlashCommandBuilder()
    .setName("guard")
    .setDescription("Guard bot güvenlik komutları")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("setup").setDescription("Karantina rolünü oluşturur"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Koruma ayarlarını gösterir"))
    .addSubcommand((sub) =>
      sub
        .setName("lockdown")
        .setDescription("Sunucuyu geçici olarak kilitler")
        .addIntegerOption((option) =>
          option
            .setName("dakika")
            .setDescription("Kilit süresi")
            .setMinValue(1)
            .setMaxValue(120)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName("unlock").setDescription("Sunucu kilidini kaldırır"))
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Bir korumayı açar veya kapatır")
        .addStringOption((option) =>
          option
            .setName("koruma")
            .setDescription("Değiştirilecek koruma")
            .setRequired(true)
            .addChoices(...features.map(([value, name]) => ({ name, value })))
        )
        .addBooleanOption((option) =>
          option.setName("aktif").setDescription("Koruma aktif mi?").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("whitelist")
        .setDescription("Whitelist kullanıcılarını yönetir")
        .addStringOption((option) =>
          option
            .setName("islem")
            .setDescription("Yapılacak işlem")
            .setRequired(true)
            .addChoices(
              { name: "Ekle", value: "add" },
              { name: "Çıkar", value: "remove" },
              { name: "Listele", value: "list" }
            )
        )
        .addUserOption((option) =>
          option.setName("kullanici").setDescription("Whitelist kullanıcısı")
        )
    )
].map((command) => command.toJSON());

async function setupGuild(guild) {
  let quarantineRole = guild.roles.cache.find(
    (role) => role.name === "Guard Quarantine"
  );
  if (!quarantineRole) {
    quarantineRole = await guild.roles.create({
      name: "Guard Quarantine",
      color: 0xed4245,
      reason: "Guard bot karantina rolü"
    });
  }

  storage.update(guild.id, (settings) => {
    settings.quarantineRoleId = quarantineRole.id;
  });
  return { quarantineRole };
}

async function handleCommand(interaction) {
  if (!interaction.inGuild()) return;
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: "Bu komut için `Sunucuyu Yönet` yetkisi gerekiyor.", ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const settings = storage.get(interaction.guildId);

  if (subcommand === "setup") {
    await interaction.deferReply({ ephemeral: true });
    const { quarantineRole } = await setupGuild(interaction.guild);
    await interaction.editReply(
      `Kurulum tamamlandı.\nKarantina rolü: ${quarantineRole}`
    );
    return;
  }

  if (subcommand === "status") {
    const lines = features.map(
      ([key, name]) => `• **${name}:** ${settings[key].enabled ? "Açık" : "Kapalı"}`
    );
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🛡️ Guard Bot Durumu")
      .setDescription(lines.join("\n"))
      .addFields(
        { name: "Whitelist", value: `${settings.whitelist.length} kullanıcı`, inline: true },
        { name: "Anti-raid", value: `${settings.antiRaid.joinLimit} kişi / ${settings.antiRaid.windowSeconds} sn`, inline: true }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === "toggle") {
    const feature = interaction.options.getString("koruma", true);
    const enabled = interaction.options.getBoolean("aktif", true);
    storage.update(interaction.guildId, (value) => {
      value[feature].enabled = enabled;
    });
    return interaction.reply({
      content: `\`${feature}\` koruması **${enabled ? "açıldı" : "kapatıldı"}**.`,
      ephemeral: true
    });
  }

  if (subcommand === "lockdown" || subcommand === "unlock") {
    const minutes = interaction.options.getInteger("dakika") || settings.antiRaid.lockdownMinutes;
    storage.update(interaction.guildId, (value) => {
      value.lockdownUntil = subcommand === "lockdown" ? Date.now() + minutes * 60 * 1000 : null;
    });
    await interaction.reply({
      content: subcommand === "lockdown"
        ? `🔒 Sunucu ${minutes} dakika kilitlendi.`
        : "🔓 Sunucu kilidi kaldırıldı.",
      ephemeral: true
    });
    return;
  }

  if (subcommand === "whitelist") {
    const action = interaction.options.getString("islem", true);
    const user = interaction.options.getUser("kullanici");
    if (action !== "list" && !user) {
      return interaction.reply({ content: "Bu işlem için kullanıcı seçmelisin.", ephemeral: true });
    }
    if (action === "list") {
      const list = settings.whitelist.length
        ? settings.whitelist.map((id) => `<@${id}>`).join(", ")
        : "Whitelist boş.";
      return interaction.reply({ content: `**Whitelist:** ${list}`, ephemeral: true });
    }
    storage.update(interaction.guildId, (value) => {
      const exists = value.whitelist.includes(user.id);
      if (action === "add" && !exists) value.whitelist.push(user.id);
      if (action === "remove") value.whitelist = value.whitelist.filter((id) => id !== user.id);
    });
    return interaction.reply({
      content: `${user} whitelist'ten ${action === "add" ? "eklendi." : "çıkarıldı."}`,
      ephemeral: true
    });
  }
}

module.exports = { commandData, handleCommand };