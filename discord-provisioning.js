const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const path = require('path');
const { brandAssets } = require('./brand-kit');

function pickRoleByName(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName);
}

function pickChannel(guild, channelConfig, categoryId) {
  return guild.channels.cache.find((channel) => {
    if (channel.type !== ChannelType.GuildText) {
      return false;
    }

    if (channel.name !== channelConfig.name) {
      return false;
    }

    return categoryId ? channel.parentId === categoryId : true;
  }) ?? guild.channels.cache.find((channel) => (
    channel.type === ChannelType.GuildText &&
    channel.name === channelConfig.name
  ));
}

function pickTextChannelByName(guild, channelName) {
  return guild.channels.cache.find((channel) => (
    channel.type === ChannelType.GuildText &&
    channel.name === channelName
  ));
}

function resolvePermissionFlags(flags) {
  return flags.reduce((resolved, flag) => {
    resolved |= PermissionFlagsBits[flag];
    return resolved;
  }, 0n);
}

function buildPermissionOverwrites(overwrites, roleIds) {
  return overwrites.map((overwrite) => {
    const id = overwrite.target === '@everyone'
      ? roleIds.everyone
      : roleIds[overwrite.target];

    if (!id) {
      throw new Error(`Unknown overwrite target: ${overwrite.target}`);
    }

    return {
      id,
      allow: resolvePermissionFlags(overwrite.allow ?? []),
      deny: resolvePermissionFlags(overwrite.deny ?? []),
    };
  });
}

function applyEmbedData(embedBuilder, embed) {
  embedBuilder
    .setTitle(embed.title)
    .setDescription(embed.description)
    .setColor(embed.color);

  if (embed.fields?.length) {
    embedBuilder.addFields(embed.fields);
  }

  if (embed.thumbnail ?? brandAssets.logos.square.url) {
    embedBuilder.setThumbnail(embed.thumbnail ?? brandAssets.logos.square.url);
  }

  if (embed.image) {
    embedBuilder.setImage(embed.image);
  }

  return embedBuilder;
}

function buildAttachmentFiles(assets = []) {
  const resolvedAssets = [brandAssets.logos.square, ...assets];
  const seenNames = new Set();

  return resolvedAssets.flatMap((asset) => {
    if (!asset?.name || seenNames.has(asset.name)) {
      return [];
    }

    seenNames.add(asset.name);
    const relativePathSegments = asset.path.split(/[\\/]+/);
    return [{
      attachment: path.join(__dirname, ...relativePathSegments),
      name: asset.name,
    }];
  });
}

function buildSeedEmbed(seed) {
  const embedBuilder = new EmbedBuilder();
  const marker = `TitanTreasure Setup • ${seed.key}`;

  applyEmbedData(embedBuilder, seed.embed);
  embedBuilder.setFooter({ text: marker });

  return embedBuilder;
}

async function ensureRole(guild, roleConfig) {
  let role = pickRoleByName(guild, roleConfig.name);
  const data = {
    name: roleConfig.name,
    colors: { primaryColor: roleConfig.color },
    hoist: roleConfig.hoist,
    mentionable: roleConfig.mentionable,
    permissions: roleConfig.permissions,
  };

  if (!role) {
    role = await guild.roles.create({
      ...data,
      reason: 'TitanTreasure bootstrap role provisioning',
    });
    console.log(`Created role: ${roleConfig.name}`);
    return role;
  }

  await role.edit(data, 'TitanTreasure bootstrap role sync');
  console.log(`Updated role: ${roleConfig.name}`);
  return role;
}

async function ensureCategory(guild, categoryConfig, roleIds) {
  const overwriteData = buildPermissionOverwrites(
    categoryConfig.permissionOverwrites,
    roleIds,
  );

  let category = guild.channels.cache.find((channel) => (
    channel.type === ChannelType.GuildCategory &&
    channel.name === categoryConfig.name
  ));

  if (!category) {
    category = await guild.channels.create({
      name: categoryConfig.name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwriteData,
      reason: 'TitanTreasure bootstrap category provisioning',
    });
    console.log(`Created category: ${categoryConfig.name}`);
    return category;
  }

  await category.edit({
    name: categoryConfig.name,
    permissionOverwrites: overwriteData,
  }, 'TitanTreasure bootstrap category sync');
  console.log(`Updated category: ${categoryConfig.name}`);
  return category;
}

async function ensureTextChannel(guild, channelConfig, category, roleIds) {
  const overwriteData = buildPermissionOverwrites(
    channelConfig.permissionOverwrites ?? [],
    roleIds,
  );

  let channel = pickChannel(guild, channelConfig, category.id);

  if (!channel) {
    channel = await guild.channels.create({
      name: channelConfig.name,
      type: ChannelType.GuildText,
      topic: channelConfig.topic,
      parent: category.id,
      permissionOverwrites: overwriteData,
      reason: 'TitanTreasure bootstrap channel provisioning',
    });
    console.log(`Created channel: #${channelConfig.name}`);
    return channel;
  }

  await channel.edit({
    name: channelConfig.name,
    topic: channelConfig.topic,
    parent: category.id,
    permissionOverwrites: overwriteData,
  }, 'TitanTreasure bootstrap channel sync');
  console.log(`Updated channel: #${channelConfig.name}`);
  return channel;
}

async function ensureSeedMessage(channel, seed, clientUserId) {
  const marker = `TitanTreasure Setup • ${seed.key}`;
  const messages = await channel.messages.fetch({ limit: 50 });
  const existingMessage = messages.find((message) => (
    message.author?.id === clientUserId &&
    message.embeds.some((embed) => embed.footer?.text === marker)
  ));

  const embed = buildSeedEmbed(seed);
  const payload = {
    embeds: [embed],
    files: buildAttachmentFiles(seed.assets),
  };

  if (existingMessage) {
    await existingMessage.edit(payload);
    if (seed.pin && !existingMessage.pinned) {
      await existingMessage.pin('TitanTreasure bootstrap pin');
    }
    console.log(`Updated seed embed in #${channel.name}: ${seed.key}`);
    return;
  }

  const sentMessage = await channel.send(payload);
  if (seed.pin) {
    await sentMessage.pin('TitanTreasure bootstrap pin');
  }
  console.log(`Posted seed embed in #${channel.name}: ${seed.key}`);
}

async function removeRetiredChannels(guild, retiredChannels = []) {
  for (const channelName of retiredChannels) {
    const channel = guild.channels.cache.find((entry) => (
      entry.type === ChannelType.GuildText &&
      entry.name === channelName
    ));

    if (!channel) {
      continue;
    }

    await channel.delete('TitanTreasure bootstrap retired channel cleanup');
    console.log(`Deleted retired channel: #${channelName}`);
  }
}

async function removeRetiredCategories(guild, retiredCategories = []) {
  for (const categoryName of retiredCategories) {
    const category = guild.channels.cache.find((entry) => (
      entry.type === ChannelType.GuildCategory &&
      entry.name === categoryName
    ));

    if (!category) {
      continue;
    }

    if (guild.channels.cache.some((entry) => entry.parentId === category.id)) {
      console.log(`Skipped retired category cleanup for ${categoryName} because channels still exist inside it.`);
      continue;
    }

    await category.delete('TitanTreasure bootstrap retired category cleanup');
    console.log(`Deleted retired category: ${categoryName}`);
  }
}

async function syncGuild(guild, template, clientUserId) {
  const roleIds = { everyone: guild.roles.everyone.id };

  for (const roleConfig of template.roles) {
    const role = await ensureRole(guild, roleConfig);
    roleIds[roleConfig.key] = role.id;
  }

  for (const categoryConfig of template.categories) {
    const category = await ensureCategory(guild, categoryConfig, roleIds);

    for (const channelConfig of categoryConfig.channels) {
      const channel = await ensureTextChannel(guild, channelConfig, category, roleIds);

      for (const seed of channelConfig.seedMessages ?? []) {
        await ensureSeedMessage(channel, seed, clientUserId);
      }
    }
  }

  await removeRetiredChannels(guild, template.retiredChannels);
  await removeRetiredCategories(guild, template.retiredCategories);
}

module.exports = {
  applyEmbedData,
  buildAttachmentFiles,
  buildPermissionOverwrites,
  pickRoleByName,
  pickTextChannelByName,
  syncGuild,
};
