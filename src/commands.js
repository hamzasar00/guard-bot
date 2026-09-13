const {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder
} = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
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
    .setName("koruma")
    .setDescription("Guard bot güvenlik komutları")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("kurulum").setDescription("Karantina rolünü oluşturur"))
    .addSubcommand((sub) => sub
      .setName("katil")
      .setDescription("Seçilen ses kanalına girer")
      .addChannelOption((option) => option
        .setName("kanal")
        .setDescription("Girilmesi gereken ses kanalı")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
      )
    )
    .addSubcommand((sub) => sub.setName("cik").setDescription("Ses kanalından çıkar"))
    .addSubcommand((sub) => sub.setName("durum").setDescription("Koruma ayarlarını gösterir"))
    .addSubcommand((sub) =>
      sub
        .setName("kilitle")
        .setDescription("Yeni katılımları geçici olarak engeller")
        .addIntegerOption((option) =>
          option
            .setName("dakika")
            .setDescription("Kilit süresi")
            .setMinValue(1)
            .setMaxValue(120)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName("kilidi-ac").setDescription("Sunucu kilidini kaldırır"))
    .addSubcommand((sub) =>
      sub
        .setName("ayarla")
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
        .setName("beyaz-liste")
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
  const botMember = guild.members.me;
  if (
    botMember &&
    !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
  ) {
    throw new Error("Botun rolleri yönetme yetkisi yok.");
  }

  const settings = storage.get(guild.id);
  const roleName = settings.quarantineRoleName || "Guard Quarantine";
  let quarantineRole = guild.roles.cache.find(
    (role) => role.name === roleName
  );
  if (!quarantineRole) {
    quarantineRole = await guild.roles.create({
      name: roleName,
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
    return interaction.reply({ content: "Bu komut için `Sunucuyu Yönet` yetkisi gerekiyor.", flags: MessageFlags.Ephemeral });
  }

  const subcommand = interaction.options.getSubcommand();
  const settings = storage.get(interaction.guildId);

  if (subcommand === "katil") {
    const voiceChannel = interaction.options.getChannel("kanal", true);
    const botMember = interaction.guild.members.me;
    const channelPermissions = voiceChannel.permissionsFor(botMember);
    if (!channelPermissions?.has(PermissionFlagsBits.Connect)) {
      return interaction.reply({
        content: "Botun bu ses kanalına bağlanma izni yok.",
        flags: MessageFlags.Ephemeral
      });
    }

    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    return interaction.reply({
      content: "Ses kanalına girdim: **" + voiceChannel.name + "**",
      flags: MessageFlags.Ephemeral
    });
  }

  if (subcommand === "cik") {
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      return interaction.reply({
        content: "Bot şu anda bir ses kanalında değil.",
        flags: MessageFlags.Ephemeral
      });
    }
    connection.destroy();
    return interaction.reply({
      content: "Ses kanalından çıktım.",
      flags: MessageFlags.Ephemeral
    });
  }
  if (subcommand === "kurulum") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let quarantineRole;
    try {
      ({ quarantineRole } = await setupGuild(interaction.guild));
    } catch (error) {
      console.error("[SETUP] Kurulum başarısız:", error.message);
      return interaction.editReply(
        `Kurulum başarısız: ${error.message} Botta **Rolleri Yönet** yetkisi olduğundan emin ol.`
      );
    }
    await interaction.editReply(
      `Kurulum tamamlandı.\nKarantina rolü: ${quarantineRole}`
    );
    return;
  }

  if (subcommand === "durum") {
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
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (subcommand === "ayarla") {
    const feature = interaction.options.getString("koruma", true);
    const enabled = interaction.options.getBoolean("aktif", true);
    storage.update(interaction.guildId, (value) => {
      value[feature].enabled = enabled;
    });
    return interaction.reply({
      content: `\`${feature}\` koruması **${enabled ? "açıldı" : "kapatıldı"}**.`,
      flags: MessageFlags.Ephemeral
    });
  }

  if (subcommand === "kilitle" || subcommand === "kilidi-ac") {
    const minutes = interaction.options.getInteger("dakika") || settings.antiRaid.lockdownMinutes;
    storage.update(interaction.guildId, (value) => {
      value.lockdownUntil = subcommand === "kilitle" ? Date.now() + minutes * 60 * 1000 : null;
    });
    await interaction.reply({
      content: subcommand === "kilitle"
        ? `🔒 Yeni katılım kilidi ${minutes} dakika aktif.`
        : "🔓 Yeni katılım kilidi kaldırıldı.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (subcommand === "beyaz-liste") {
    const action = interaction.options.getString("islem", true);
    const user = interaction.options.getUser("kullanici");
    if (action !== "list" && !user) {
      return interaction.reply({ content: "Bu işlem için kullanıcı seçmelisin.", flags: MessageFlags.Ephemeral });
    }
    if (action === "list") {
      const list = settings.whitelist.length
        ? settings.whitelist.map((id) => `<@${id}>`).join(", ")
        : "Whitelist boş.";
      return interaction.reply({ content: `**Whitelist:** ${list}`, flags: MessageFlags.Ephemeral });
    }
    storage.update(interaction.guildId, (value) => {
      const exists = value.whitelist.includes(user.id);
      if (action === "add" && !exists) value.whitelist.push(user.id);
      if (action === "remove") value.whitelist = value.whitelist.filter((id) => id !== user.id);
    });
    return interaction.reply({
      content: `${user} whitelist'ten ${action === "add" ? "eklendi." : "çıkarıldı."}`,
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = { commandData, handleCommand };