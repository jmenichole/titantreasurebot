require('dotenv').config({ quiet: true });

const {
  Client,
  GatewayIntentBits,
} = require('discord.js');
const { syncGuild } = require('./discord-provisioning');
const { serverTemplate } = require('./server-template');

const REQUIRED_ENV_VARS = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
];

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function validateEnvironment() {
  for (const name of REQUIRED_ENV_VARS) {
    getRequiredEnv(name);
  }
}

async function main() {
  validateEnvironment();

  const token = getRequiredEnv('DISCORD_BOT_TOKEN');
  const guildId = getRequiredEnv('DISCORD_GUILD_ID');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  try {
    await client.login(token);
    const guild = await client.guilds.fetch(guildId);
    await guild.fetch();
    await guild.roles.fetch();
    await guild.channels.fetch();
    await syncGuild(guild, serverTemplate, client.user.id);
    console.log('TitanTreasure bootstrap complete.');
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
