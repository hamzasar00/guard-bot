const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} = require("discord.js");
const config = require("./config");
const { commandData, handleCommand } = require("./commands");
const { registerEvents, onReady } = require("./events");

if (!config.token || !config.clientId) {
  console.error("[CONFIG] .env dosyasinda DISCORD_TOKEN ve CLIENT_ID zorunludur.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body: commandData });
  console.log(
    `[COMMANDS] ${commandData.length} komut ${config.guildId ? "test sunucusuna" : "global olarak"} yüklendi.`
  );
}

client.once(Events.ClientReady, async () => {
  await onReady(client);
  try {
    await registerCommands();
  } catch (error) {
    console.error("[COMMANDS] Komutlar yüklenemedi:", error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "guard") return;
  try {
    await handleCommand(interaction);
  } catch (error) {
    console.error("[COMMAND] Komut hatası:", error);
    const reply = { content: "Komut çalıştırılırken bir hata oluştu.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

registerEvents(client);

process.on("unhandledRejection", (error) => {
  console.error("[PROCESS] Yakalanmayan promise hatası:", error);
});

client.login(config.token);