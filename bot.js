require('dotenv').config({ quiet: true });

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const {
  applyEmbedData,
  pickRoleByName,
  pickTextChannelByName,
  syncGuild,
} = require('./discord-provisioning');
const { serverTemplate, verificationTemplate, supportTemplate } = require('./server-template');

const REQUIRED_ENV_VARS = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
];

const enableGuildMembersIntent = process.env.ENABLE_GUILD_MEMBERS_INTENT === 'true';
const supportResponderUserId = process.env.SUPPORT_RESPONSE_USER_ID ?? supportTemplate.responderUserId;

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

function buildVerificationPanelEmbed() {
  const embed = new EmbedBuilder();

  applyEmbedData(embed, verificationTemplate.panel.embed);
  embed.setFooter({ text: `TitanTreasure Setup • ${verificationTemplate.panel.key}` });

  return embed;
}

function buildVerificationPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify:start')
        .setLabel(verificationTemplate.panel.buttonLabel)
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function buildSupportPanelEmbed() {
  const embed = new EmbedBuilder();

  applyEmbedData(embed, supportTemplate.panel.embed);
  embed.setFooter({ text: `TitanTreasure Setup • ${supportTemplate.panel.key}` });

  return embed;
}

function buildSupportPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('support:start')
        .setLabel(supportTemplate.panel.buttonLabel)
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function buildSupportTopicMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('support:topic')
      .setPlaceholder(supportTemplate.panel.menuPlaceholder)
      .addOptions(supportTemplate.topics.map((topic) => ({
        label: topic.label,
        description: topic.description,
        value: topic.key,
      }))),
  );
}

function buildReviewButtons(memberId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify:approve:${memberId}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`verify:approve-vip:${memberId}`)
        .setLabel('Approve + VIP')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`verify:reject:${memberId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

function disableComponents(rows) {
  return rows.map((row) => {
    const newRow = ActionRowBuilder.from(row);

    newRow.components = row.components.map((component) => ButtonBuilder.from(component).setDisabled(true));
    return newRow;
  });
}

function isStaffReviewer(member) {
  return verificationTemplate.staffRoleNames.some((roleName) => (
    member.roles.cache.some((role) => role.name === roleName)
  ));
}

function buildSubmissionEmbed(member, answers) {
  return new EmbedBuilder()
    .setTitle('Verification Review')
    .setDescription(`Review the submission from ${member}.`)
    .setColor('#F1C40F')
    .addFields(
      { name: 'Member', value: `${member.user.tag} (${member.id})` },
      { name: 'TitanTreasure User ID', value: answers.titanUserId },
      { name: 'How they found TitanTreasure', value: answers.referralSource },
      { name: 'VIP transfer request', value: answers.vipTransfer },
      { name: 'Site nickname / VIP notes', value: answers.notes || 'No extra notes provided.' },
    )
    .setFooter({ text: `TitanTreasure Verify • ${member.id}` })
    .setTimestamp();
}

function buildDecisionEmbed(originalEmbed, decisionLabel, actorTag) {
  const embed = EmbedBuilder.from(originalEmbed);
  const filteredFields = embed.data.fields.filter((field) => field.name !== 'Decision');

  embed.setFields([
    ...filteredFields,
    { name: 'Decision', value: `${decisionLabel} by ${actorTag}` },
  ]);
  embed.setColor(decisionLabel.startsWith('Rejected') ? '#E74C3C' : '#2ECC71');
  embed.setTimestamp();

  return embed;
}

function buildVerificationModal() {
  return new ModalBuilder()
    .setCustomId('verify:submit')
    .setTitle('TitanTreasure Verification')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('titanUserId')
          .setLabel('TitanTreasure User ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Copy the unchangeable User ID from site settings')
          .setMaxLength(50)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('referralSource')
          .setLabel('How did you find TitanTreasure?')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('vipTransfer')
          .setLabel('Need VIP transfer help? (yes/no)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(20)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('notes')
          .setLabel('Site nickname or prior VIP proof')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(false),
      ),
    );
}

async function ensureVerificationPanel(guild, clientUserId) {
  const channel = pickTextChannelByName(guild, verificationTemplate.panelChannelName);

  if (!channel) {
    throw new Error(`Missing verification channel: #${verificationTemplate.panelChannelName}`);
  }

  const marker = `TitanTreasure Setup • ${verificationTemplate.panel.key}`;
  const messages = await channel.messages.fetch({ limit: 50 });
  const existingMessage = messages.find((message) => (
    message.author?.id === clientUserId &&
    message.embeds.some((embed) => embed.footer?.text === marker)
  ));

  const payload = {
    embeds: [buildVerificationPanelEmbed()],
    components: buildVerificationPanelComponents(),
  };

  if (existingMessage) {
    await existingMessage.edit(payload);
    if (!existingMessage.pinned) {
      await existingMessage.pin('TitanTreasure verification panel');
    }
    console.log('Updated verification panel.');
    return;
  }

  const sentMessage = await channel.send(payload);
  await sentMessage.pin('TitanTreasure verification panel');
  console.log('Posted verification panel.');
}

function getSupportDeskChannel(guild) {
  const channel = pickTextChannelByName(guild, supportTemplate.panelChannelName);

  if (!channel) {
    throw new Error(`Missing support channel: #${supportTemplate.panelChannelName}`);
  }

  return channel;
}

async function ensureSupportPanel(guild, clientUserId) {
  const channel = getSupportDeskChannel(guild);
  const marker = `TitanTreasure Setup • ${supportTemplate.panel.key}`;
  const messages = await channel.messages.fetch({ limit: 50 });
  const existingMessage = messages.find((message) => (
    message.author?.id === clientUserId &&
    message.embeds.some((embed) => embed.footer?.text === marker)
  ));

  const payload = {
    embeds: [buildSupportPanelEmbed()],
    components: buildSupportPanelComponents(),
  };

  if (existingMessage) {
    await existingMessage.edit(payload);
    if (!existingMessage.pinned) {
      await existingMessage.pin('TitanTreasure support ticket panel');
    }
    console.log('Updated support ticket panel.');
    return;
  }

  const sentMessage = await channel.send(payload);
  await sentMessage.pin('TitanTreasure support ticket panel');
  console.log('Posted support ticket panel.');
}

async function ensureMemberRole(member, roleName, shouldHaveRole) {
  const role = pickRoleByName(member.guild, roleName);

  if (!role) {
    throw new Error(`Missing role: ${roleName}`);
  }

  if (shouldHaveRole && !member.roles.cache.has(role.id)) {
    await member.roles.add(role, 'TitanTreasure verification flow');
  }

  if (!shouldHaveRole && member.roles.cache.has(role.id)) {
    await member.roles.remove(role, 'TitanTreasure verification flow');
  }
}

async function applyJoinGating(member) {
  if (member.user.bot) {
    return;
  }

  const skipRoleNames = new Set([
    ...verificationTemplate.staffRoleNames,
    verificationTemplate.roleNames.verified,
    verificationTemplate.roleNames.vip,
  ]);

  const shouldSkip = member.roles.cache.some((role) => skipRoleNames.has(role.name));
  if (shouldSkip) {
    return;
  }

  await ensureMemberRole(member, verificationTemplate.roleNames.unverified, true);
}

async function backfillJoinGating(guild) {
  const members = await guild.members.fetch();

  for (const member of members.values()) {
    await applyJoinGating(member);
  }
}

function getReviewChannel(guild) {
  const channel = pickTextChannelByName(guild, verificationTemplate.reviewChannelName);

  if (!channel) {
    throw new Error(`Missing review channel: #${verificationTemplate.reviewChannelName}`);
  }

  return channel;
}

function getSupportTopicConfig(topicKey) {
  const topic = supportTemplate.topics.find((entry) => entry.key === topicKey);

  if (!topic) {
    throw new Error(`Unknown support topic: ${topicKey}`);
  }

  return topic;
}

function buildSupportThreadName(topic, user) {
  const safeUsername = user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'member';

  return `${topic.key}-${safeUsername}-${user.id}`.slice(0, 100);
}

async function findExistingSupportThread(channel, userId) {
  const activeThreads = await channel.threads.fetchActive();
  return activeThreads.threads.find((thread) => thread.name.endsWith(userId)) ?? null;
}

function buildSupportTicketEmbed(member, topic) {
  return new EmbedBuilder()
    .setTitle(`Support Ticket • ${topic.label}`)
    .setDescription(`Private support thread for ${member}.`)
    .setColor('#052967')
    .addFields(
      { name: 'Member', value: `${member.user.tag} (${member.id})` },
      { name: 'Topic', value: topic.label },
      { name: 'Status', value: 'Open - awaiting response' },
      { name: 'What to send now', value: topic.intakePrompt },
    )
    .setFooter({ text: `TitanTreasure Support • ${member.id} • ${topic.key}` })
    .setTimestamp();
}

async function handleSupportStart(interaction) {
  await interaction.reply({
    content: 'Pick the topic that best matches your issue. I will open a private support thread for you.',
    components: [buildSupportTopicMenu()],
    ephemeral: true,
  });
}

async function handleSupportTopicSelection(interaction) {
  const supportChannel = getSupportDeskChannel(interaction.guild);
  const topic = getSupportTopicConfig(interaction.values[0]);
  const responder = await interaction.guild.members.fetch(supportResponderUserId);
  const existingThread = await findExistingSupportThread(supportChannel, interaction.user.id);

  if (existingThread) {
    await existingThread.members.add(interaction.user.id);
    if (supportResponderUserId !== interaction.user.id) {
      await existingThread.members.add(supportResponderUserId);
    }

    await interaction.update({
      content: `You already have an open support ticket here: <#${existingThread.id}>`,
      components: [],
    });
    return;
  }

  const thread = await supportChannel.threads.create({
    name: buildSupportThreadName(topic, interaction.user),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PrivateThread,
    invitable: false,
    reason: `TitanTreasure support ticket for ${interaction.user.tag}`,
  });

  await thread.members.add(interaction.user.id);
  if (supportResponderUserId !== interaction.user.id) {
    await thread.members.add(supportResponderUserId);
  }

  await thread.send({
    content: `<@${responder.id}> ${interaction.user} opened a new ${topic.label.toLowerCase()} ticket.`,
    embeds: [buildSupportTicketEmbed(interaction.member, topic)],
  });

  await interaction.update({
    content: `Your private support ticket is ready: <#${thread.id}>`,
    components: [],
  });
}

async function handleVerificationSubmission(interaction) {
  const reviewChannel = getReviewChannel(interaction.guild);
  const answers = {
    titanUserId: interaction.fields.getTextInputValue('titanUserId').trim(),
    referralSource: interaction.fields.getTextInputValue('referralSource').trim(),
    vipTransfer: interaction.fields.getTextInputValue('vipTransfer').trim(),
    notes: interaction.fields.getTextInputValue('notes').trim(),
  };

  const reviewMessage = await reviewChannel.send({
    embeds: [buildSubmissionEmbed(interaction.member, answers)],
    components: buildReviewButtons(interaction.user.id),
  });

  await ensureMemberRole(interaction.member, verificationTemplate.roleNames.unverified, true);

  await interaction.reply({
    content: `Thanks — your verification request is in review. Staff will follow up in <#${reviewChannel.id}> if needed.`,
    ephemeral: true,
  });

  console.log(`Queued verification review for ${interaction.user.tag} (${reviewMessage.id}).`);
}

async function handleStaffDecision(interaction) {
  if (!isStaffReviewer(interaction.member)) {
    await interaction.reply({
      content: 'Only staff can review verification requests.',
      ephemeral: true,
    });
    return;
  }

  const [, action, memberId] = interaction.customId.split(':');
  const member = await interaction.guild.members.fetch(memberId);

  if (!member) {
    throw new Error(`Could not fetch member ${memberId}`);
  }

  const grantVip = action === 'approve-vip';
  const approve = action === 'approve' || action === 'approve-vip';

  if (approve) {
    await ensureMemberRole(member, verificationTemplate.roleNames.unverified, false);
    await ensureMemberRole(member, verificationTemplate.roleNames.verified, true);
    if (grantVip) {
      await ensureMemberRole(member, verificationTemplate.roleNames.vip, true);
    }
  }

  const decisionLabel = approve
    ? (grantVip ? 'Approved with VIP' : 'Approved')
    : 'Rejected';

  const originalEmbed = interaction.message.embeds[0];
  const updatedEmbed = buildDecisionEmbed(originalEmbed, decisionLabel, interaction.user.tag);
  const updatedComponents = disableComponents(interaction.message.components);

  await interaction.update({
    embeds: [updatedEmbed],
    components: updatedComponents,
  });

  await interaction.followUp({
    content: approve
      ? `${member.user.tag} has been updated.`
      : `${member.user.tag} remains gated as unverified.`,
    ephemeral: true,
  });
}

async function main() {
  validateEnvironment();

  const token = getRequiredEnv('DISCORD_BOT_TOKEN');
  const guildId = getRequiredEnv('DISCORD_GUILD_ID');
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ];

  if (enableGuildMembersIntent) {
    intents.push(GatewayIntentBits.GuildMembers);
  }

  const client = new Client({
    intents,
  });

  client.once('clientReady', async () => {
    try {
      const guild = await client.guilds.fetch(guildId);
      await guild.fetch();
      await guild.roles.fetch();
      await guild.channels.fetch();
      await syncGuild(guild, serverTemplate, client.user.id);
      await ensureVerificationPanel(guild, client.user.id);
      await ensureSupportPanel(guild, client.user.id);
      if (enableGuildMembersIntent) {
        await backfillJoinGating(guild);
      } else {
        console.log('GuildMembers intent disabled; join gating is limited to verification submissions and staff actions.');
      }
      console.log(`TitanTreasure bot ready as ${client.user.tag}.`);
    } catch (error) {
      console.error(error);
    }
  });

  if (enableGuildMembersIntent) {
    client.on('guildMemberAdd', async (member) => {
      try {
        await applyJoinGating(member);
        console.log(`Applied join gating to ${member.user.tag}.`);
      } catch (error) {
        console.error(error);
      }
    });
  }

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId === 'verify:start') {
          await interaction.showModal(buildVerificationModal());
          return;
        }

        if (interaction.customId === 'support:start') {
          await handleSupportStart(interaction);
          return;
        }

        if (interaction.customId.startsWith('verify:')) {
          await handleStaffDecision(interaction);
        }

        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'support:topic') {
        await handleSupportTopicSelection(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId === 'verify:submit') {
        await handleVerificationSubmission(interaction);
      }
    } catch (error) {
      console.error(error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Something went wrong while processing that action.',
          ephemeral: true,
        });
      }
    }
  });

  await client.login(token);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
