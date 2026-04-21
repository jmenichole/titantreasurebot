require('dotenv').config({ quiet: true });

const { embedThemes } = require('./brand-kit');

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const {
  applyEmbedData,
  buildAttachmentFiles,
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
const cleanupCommandUserId = supportResponderUserId;
const activeSupportTicketUsers = new Set();
const activeVerificationUsers = new Set();

const clearChannelCommand = new SlashCommandBuilder()
  .setName('clear-channel')
  .setDescription('Clear all non-pinned messages from the current channel.');

function isInteractionAcknowledgedError(error) {
  return error?.code === 40060;
}

function canUseCleanupCommand(userId) {
  return cleanupCommandUserId && userId === cleanupCommandUserId;
}

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

function replaceTemplateTokens(text, values) {
  return Object.entries(values).reduce((result, [key, value]) => (
    result.replaceAll(`{${key}}`, value)
  ), text);
}

function buildSupportPanelEmbed() {
  const embed = new EmbedBuilder();

  applyEmbedData(embed, supportTemplate.panel.embed);
  embed.setFooter({ text: `TitanTreasure Setup • ${supportTemplate.panel.key}` });

  return embed;
}

function buildWelcomeDmEmbed(channelId) {
  const embed = new EmbedBuilder();
  const dmConfig = verificationTemplate.joinExperience.dm;
  const embedData = {
    ...dmConfig.embed,
    description: replaceTemplateTokens(dmConfig.embed.description, { channelId }),
    fields: dmConfig.embed.fields.map((field) => ({
      ...field,
      value: replaceTemplateTokens(field.value, { channelId }),
    })),
  };

  applyEmbedData(embed, embedData);
  embed.setFooter({ text: 'TitanTreasure Setup • welcome-dm' });

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

function getEmbedFieldValue(embed, fieldName) {
  return embed?.fields?.find((field) => field.name === fieldName)?.value ?? null;
}

function replaceOrAppendField(fields, name, value) {
  const nextFields = fields.filter((field) => field.name !== name);
  nextFields.push({ name, value });
  return nextFields;
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

function memberHasRoleName(member, roleName) {
  return member.roles.cache.some((role) => role.name === roleName);
}

async function fetchInteractionMember(interaction) {
  return interaction.guild.members.fetch(interaction.user.id);
}

function buildSubmissionEmbed(member, answers) {
  return new EmbedBuilder()
    .setTitle('Verification Review')
    .setDescription(`Review the submission from ${member}.`)
    .setColor('#F1C40F')
    .setThumbnail('attachment://tt-logo-square.png')
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
  embed.setThumbnail('attachment://tt-logo-square.png');
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

function getTrimmedInputValue(interaction, fieldName) {
  return interaction.fields.getTextInputValue(fieldName).trim();
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
    files: buildAttachmentFiles(verificationTemplate.panel.assets),
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
    files: buildAttachmentFiles(supportTemplate.panel.assets),
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

async function getOnboardingChannel(guild) {
  const channel = await guild.channels.fetch(verificationTemplate.onboardingChannelId);

  if (!channel) {
    throw new Error(`Missing onboarding channel: ${verificationTemplate.onboardingChannelId}`);
  }

  if (!channel.isTextBased() || typeof channel.send !== 'function') {
    throw new Error(`Onboarding channel is not message-capable: ${verificationTemplate.onboardingChannelId}`);
  }

  return channel;
}

async function sendJoinWelcome(member) {
  const onboardingChannel = await getOnboardingChannel(member.guild);
  const landingMessage = replaceTemplateTokens(
    verificationTemplate.joinExperience.landingMessage,
    {
      member: `${member}`,
      channelId: onboardingChannel.id,
    },
  );

  await onboardingChannel.send({
    content: landingMessage,
    allowedMentions: { users: [member.id] },
  });

  await member.send({
    embeds: [buildWelcomeDmEmbed(onboardingChannel.id)],
    files: buildAttachmentFiles(verificationTemplate.joinExperience.dm.assets),
  });
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

async function getSupportResponders(guild) {
  await guild.members.fetch();

  const responderIds = new Set();
  const supportRoleNames = new Set([
    supportTemplate.responderRoleName,
    ...verificationTemplate.staffRoleNames,
  ].filter(Boolean));

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) {
      continue;
    }

    if (member.roles.cache.some((role) => supportRoleNames.has(role.name))) {
      responderIds.add(member.id);
    }
  }

  if (responderIds.size === 0 && supportResponderUserId) {
    responderIds.add(supportResponderUserId);
  }

  const supportRole = supportTemplate.responderRoleName
    ? pickRoleByName(guild, supportTemplate.responderRoleName)
    : null;

  return {
    responderIds: [...responderIds],
    supportRoleId: supportRole?.id ?? null,
    mention: supportRole ? `<@&${supportRole.id}>` : [...responderIds].map((id) => `<@${id}>`).join(' '),
  };
}

function buildSupportTicketEmbed(member, topic) {
  const embed = new EmbedBuilder()
    .setTitle(`Support Ticket • ${topic.label}`)
    .setDescription(`Private support thread for ${member}.`)
    .setColor('#052967')
    .setThumbnail('attachment://tt-logo-square.png')
    .addFields(
      { name: 'Member', value: `${member.user.tag} (${member.id})` },
      { name: 'Topic', value: topic.label },
      { name: 'Status', value: 'Open - awaiting response' },
      { name: 'What to send now', value: topic.intakePrompt },
    )
    .setFooter({ text: `TitanTreasure Support • ${member.id} • ${topic.key}` })
    .setTimestamp();

  if (topic.key === 'vip') {
    embed.addFields({
      name: 'VIP transfer flow',
      value: 'Use this private thread to complete the VIP transfer. Send proof, site details, and anything staff need to finish the handoff cleanly. Staff can relay the case to Telegram for owner review once the proof is ready.',
    });
  }

  return embed;
}

function getVipCaseMarker(threadId) {
  return `TitanTreasure VIP Case • ${threadId}`;
}

function buildVipCaseControlRows(threadId, { relayedToTelegram = false } = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vipcase:proof:${threadId}`)
        .setLabel(supportTemplate.vipTransfer.controls.markProofReceivedLabel)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`vipcase:relay:${threadId}`)
        .setLabel(supportTemplate.vipTransfer.controls.relayToTelegramLabel)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(relayedToTelegram),
      new ButtonBuilder()
        .setCustomId(`vipcase:complete:${threadId}`)
        .setLabel(supportTemplate.vipTransfer.controls.markCompleteLabel)
        .setStyle(ButtonStyle.Success),
    ),
  ];
}

function buildVipCaseEmbed({
  threadId,
  memberValue,
  threadValue,
  status,
  telegramStatus,
  lastAction,
  telegramMessageId,
}) {
  const embed = new EmbedBuilder()
    .setTitle(supportTemplate.vipTransfer.opsMessage.title)
    .setDescription(supportTemplate.vipTransfer.opsMessage.description)
    .setColor(embedThemes.vip)
    .setThumbnail('attachment://tt-logo-square.png')
    .addFields(
      { name: 'Member', value: memberValue },
      { name: 'Discord thread', value: threadValue },
      { name: 'Status', value: status },
      { name: 'Telegram handoff', value: telegramStatus },
      { name: 'Last action', value: lastAction },
    )
    .setFooter({ text: getVipCaseMarker(threadId) })
    .setTimestamp();

  if (telegramMessageId) {
    embed.addFields({
      name: 'Telegram message ID',
      value: `${telegramMessageId}`,
    });
  }

  return embed;
}

function buildDiscordThreadUrl(thread) {
  return `https://discord.com/channels/${thread.guild.id}/${thread.parentId}/${thread.id}`;
}

function getTelegramConfig() {
  const allowedChatIds = (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedUserIds = (process.env.TELEGRAM_ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    vipChatId: process.env.TELEGRAM_VIP_CHAT_ID ?? '',
    vipThreadId: process.env.TELEGRAM_VIP_THREAD_ID ?? '',
    announcementChatId: process.env.TELEGRAM_ANNOUNCEMENT_CHAT_ID ?? '',
    announcementThreadId: process.env.TELEGRAM_ANNOUNCEMENT_THREAD_ID ?? '',
    allowedChatIds,
    allowedUserIds,
    pollIntervalMs: Number(process.env.TELEGRAM_POLL_INTERVAL_MS ?? '5000'),
  };
}

function getVipCaseId(threadId) {
  return `${threadId}`;
}

function buildTelegramActorLabel(message) {
  if (message.from?.username) {
    return `@${message.from.username}`;
  }

  return [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || `${message.from?.id ?? 'unknown-user'}`;
}

function extractMemberId(memberValue) {
  return memberValue?.match(/\((\d+)\)/)?.[1] ?? null;
}

function getVipCaseFooter(threadId) {
  return getVipCaseMarker(threadId);
}

async function replyToTelegram(botToken, chatId, text, threadId) {
  const payload = {
    chat_id: chatId,
    text,
  };

  if (threadId) {
    payload.message_thread_id = threadId;
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? `Telegram reply failed with status ${response.status}.`);
  }

  return result;
}

function parseTelegramCommand(text) {
  const trimmed = text.trim();

  if (!trimmed.startsWith('/')) {
    return null;
  }

  const [rawCommand] = trimmed.split(/\s+/, 1);
  const argsText = trimmed.slice(rawCommand.length).trim();

  return {
    name: rawCommand.slice(1).split('@')[0].toLowerCase(),
    argsText,
    args: argsText ? argsText.split(/\s+/) : [],
  };
}

function isAuthorizedTelegramSource(message) {
  const {
    vipChatId,
    announcementChatId,
    allowedChatIds,
    allowedUserIds,
  } = getTelegramConfig();
  const validChatIds = new Set([
    vipChatId,
    announcementChatId,
    ...allowedChatIds,
  ].filter(Boolean));
  const validUserIds = new Set(allowedUserIds);

  if (validChatIds.size > 0 && !validChatIds.has(`${message.chat.id}`)) {
    return false;
  }

  if (validUserIds.size > 0 && !validUserIds.has(`${message.from?.id ?? ''}`)) {
    return false;
  }

  return validChatIds.size > 0 || validUserIds.size > 0;
}

function isTelegramThreadMatch(message, expectedThreadId) {
  if (!expectedThreadId) {
    return true;
  }

  return `${message.message_thread_id ?? ''}` === `${expectedThreadId}`;
}

function getTelegramReplyThreadId(message) {
  return message.message_thread_id ? Number(message.message_thread_id) : undefined;
}

async function findVipCaseMessage(guild, caseId) {
  const opsChannel = await getVipOpsChannel(guild);
  let before;

  while (true) {
    const messages = await opsChannel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (messages.size === 0) {
      break;
    }

    const caseMessage = messages.find((message) => (
      message.embeds.some((embed) => embed.footer?.text === getVipCaseFooter(caseId))
    ));

    if (caseMessage) {
      return caseMessage;
    }

    before = messages.last()?.id;
  }

  return null;
}

function buildTelegramAnnouncementEmbed(messageText, actorLabel) {
  return new EmbedBuilder()
    .setTitle('Telegram Announcement')
    .setDescription(messageText)
    .setColor(embedThemes.announcement)
    .setFooter({ text: `Posted from Telegram by ${actorLabel}` })
    .setTimestamp();
}

async function getAnnouncementChannel(guild) {
  const channel = pickTextChannelByName(guild, supportTemplate.vipTransfer.announceChannelName);

  if (!channel) {
    throw new Error(`Missing announcement channel: #${supportTemplate.vipTransfer.announceChannelName}`);
  }

  return channel;
}

async function upsertVipCaseMessage(caseMessage, {
  status,
  telegramStatus,
  lastAction,
  telegramMessageId,
}) {
  const currentEmbed = caseMessage.embeds[0];
  const embedBuilder = EmbedBuilder.from(currentEmbed);
  let fields = [...(embedBuilder.data.fields ?? [])];

  if (status) {
    fields = replaceOrAppendField(fields, 'Status', status);
  }

  if (telegramStatus) {
    fields = replaceOrAppendField(fields, 'Telegram handoff', telegramStatus);
  }

  if (lastAction) {
    fields = replaceOrAppendField(fields, 'Last action', lastAction);
  }

  if (telegramMessageId) {
    fields = replaceOrAppendField(fields, 'Telegram message ID', `${telegramMessageId}`);
  }

  embedBuilder.setFields(fields);
  embedBuilder.setTimestamp();

  const caseId = currentEmbed.footer?.text?.replace('TitanTreasure VIP Case • ', '') ?? '';
  const relayedToTelegram = Boolean(getEmbedFieldValue(embedBuilder.data, 'Telegram message ID'))
    || (getEmbedFieldValue(embedBuilder.data, 'Telegram handoff') ?? '').startsWith(supportTemplate.vipTransfer.telegramSentLabel);

  await caseMessage.edit({
    embeds: [embedBuilder],
    components: buildVipCaseControlRows(caseId, { relayedToTelegram }),
    files: buildAttachmentFiles(),
  });
}

async function getVipOpsChannel(guild) {
  const channel = pickTextChannelByName(guild, supportTemplate.vipTransfer.opsChannelName);

  if (!channel) {
    throw new Error(`Missing VIP ops channel: #${supportTemplate.vipTransfer.opsChannelName}`);
  }

  return channel;
}

async function createVipOpsCase(guild, thread, member) {
  const opsChannel = await getVipOpsChannel(guild);

  await opsChannel.send({
    content: `New VIP transfer case from ${member}. Thread: <#${thread.id}>`,
    embeds: [buildVipCaseEmbed({
      threadId: thread.id,
      memberValue: `${member.user.tag} (${member.id})`,
      threadValue: `<#${thread.id}>`,
      status: supportTemplate.vipTransfer.defaultStatus,
      telegramStatus: supportTemplate.vipTransfer.telegramPendingLabel,
      lastAction: 'Case opened in Discord',
    })],
    components: buildVipCaseControlRows(thread.id),
    files: buildAttachmentFiles(),
  });
}

async function collectVipTranscript(thread) {
  const messages = await thread.messages.fetch({ limit: 20 });
  const transcriptLines = [...messages.values()]
    .sort((left, right) => left.createdTimestamp - right.createdTimestamp)
    .filter((message) => !message.author.bot)
    .map((message) => {
      const attachmentUrls = [...message.attachments.values()].map((attachment) => attachment.url);
      const parts = [message.content.trim(), ...attachmentUrls].filter(Boolean);

      if (parts.length === 0) {
        return null;
      }

      return `${message.author.tag}: ${parts.join(' ')}`;
    })
    .filter(Boolean)
    .slice(-5);

  return transcriptLines.length > 0
    ? transcriptLines.join('\n')
    : supportTemplate.vipTransfer.telegram.transcriptFallback;
}

async function sendVipCaseToTelegram({ thread, caseEmbed, actorTag }) {
  const { botToken, vipChatId, vipThreadId } = getTelegramConfig();

  if (!botToken || !vipChatId) {
    throw new Error('Telegram VIP handoff is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_VIP_CHAT_ID.');
  }

  const transcript = await collectVipTranscript(thread);
  const telegramPayload = {
    chat_id: vipChatId,
    disable_web_page_preview: true,
    text: [
      supportTemplate.vipTransfer.telegram.handoffTitle,
      '',
      `Case ID: ${getVipCaseId(thread.id)}`,
      `Status: ${supportTemplate.vipTransfer.telegram.readyStatus}`,
      `Handled by: ${actorTag}`,
      `Member: ${getEmbedFieldValue(caseEmbed, 'Member') ?? 'Unknown'}`,
      `Discord thread: ${buildDiscordThreadUrl(thread)}`,
      '',
      'Recent Discord transcript:',
      transcript,
      '',
      'Owner commands:',
      supportTemplate.vipTransfer.telegram.commands.approve,
      supportTemplate.vipTransfer.telegram.commands.deny,
      supportTemplate.vipTransfer.telegram.commands.moreInfo,
    ].join('\n'),
  };

  if (/^\d+$/.test(vipThreadId)) {
    telegramPayload.message_thread_id = Number(vipThreadId);
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(telegramPayload),
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram handoff failed with status ${response.status}.`);
  }

  return payload.result.message_id;
}

async function processTelegramVipDecision(guild, {
  caseId,
  status,
  telegramStatus,
  lastAction,
  threadMessage,
  grantVip,
}) {
  const caseMessage = await findVipCaseMessage(guild, caseId);

  if (!caseMessage) {
    throw new Error(`Could not find VIP case ${caseId} in #${supportTemplate.vipTransfer.opsChannelName}.`);
  }

  const memberValue = getEmbedFieldValue(caseMessage.embeds[0], 'Member');
  const memberId = extractMemberId(memberValue);

  if (!memberId) {
    throw new Error(`Could not resolve the Discord member for case ${caseId}.`);
  }

  const member = await guild.members.fetch(memberId);
  const thread = await guild.channels.fetch(caseId);

  if (!thread || !thread.isTextBased()) {
    throw new Error(`Could not find Discord thread ${caseId} for this VIP case.`);
  }

  if (grantVip) {
    await ensureMemberRole(member, verificationTemplate.roleNames.unverified, false);
    await ensureMemberRole(member, verificationTemplate.roleNames.verified, true);
    await ensureMemberRole(member, verificationTemplate.roleNames.vip, true);
  }

  await thread.send({
    content: threadMessage(member),
  });

  await upsertVipCaseMessage(caseMessage, {
    status,
    telegramStatus,
    lastAction,
  });

  return { member, thread };
}

async function handleTelegramApproveCommand(guild, message, caseId) {
  const actorLabel = buildTelegramActorLabel(message);
  const { member } = await processTelegramVipDecision(guild, {
    caseId,
    status: supportTemplate.vipTransfer.approvedStatus,
    telegramStatus: `Owner approved via Telegram by ${actorLabel}`,
    lastAction: `Approved in Telegram by ${actorLabel}`,
    threadMessage: (member) => `VIP transfer approved by owner via Telegram for ${member}. The VIP role has been granted.`,
    grantVip: true,
  });

  return `${member.user.tag} was approved for VIP in Discord for case ${caseId}.`;
}

async function handleTelegramDenyCommand(guild, message, caseId, reasonText) {
  const actorLabel = buildTelegramActorLabel(message);
  const denialReason = reasonText ? ` Reason: ${reasonText}` : '';
  const { member } = await processTelegramVipDecision(guild, {
    caseId,
    status: supportTemplate.vipTransfer.deniedStatus,
    telegramStatus: `Owner denied via Telegram by ${actorLabel}`,
    lastAction: `Denied in Telegram by ${actorLabel}`,
    threadMessage: () => `VIP transfer was not approved by owner via Telegram.${denialReason}`,
    grantVip: false,
  });

  return `${member.user.tag} was denied for case ${caseId}.${reasonText ? ` Reason sent to Discord: ${reasonText}` : ''}`;
}

async function handleTelegramMoreInfoCommand(guild, message, caseId, detailsText) {
  const actorLabel = buildTelegramActorLabel(message);
  const requestText = detailsText || 'Please send the missing proof or details needed for owner review.';
  const { member } = await processTelegramVipDecision(guild, {
    caseId,
    status: supportTemplate.vipTransfer.moreInfoStatus,
    telegramStatus: `Owner requested more info via Telegram by ${actorLabel}`,
    lastAction: `More info requested in Telegram by ${actorLabel}`,
    threadMessage: (member) => `Owner requested more information via Telegram from ${member}. Details: ${requestText}`,
    grantVip: false,
  });

  return `Requested more info for ${member.user.tag} on case ${caseId}.`;
}

async function handleTelegramAnnounceCommand(guild, message, announcementText) {
  if (!announcementText) {
    throw new Error('Use /announce <message> to post into the Discord announcements channel.');
  }

  const actorLabel = buildTelegramActorLabel(message);
  const announcementChannel = await getAnnouncementChannel(guild);

  await announcementChannel.send({
    embeds: [buildTelegramAnnouncementEmbed(announcementText, actorLabel)],
    files: buildAttachmentFiles(),
  });

  return `Posted your announcement into #${announcementChannel.name}.`;
}

async function fetchTelegramUpdates(botToken, offset) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      offset,
      timeout: 0,
      allowed_updates: ['message'],
    }),
  });
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram getUpdates failed with status ${response.status}.`);
  }

  return payload.result;
}

async function handleTelegramCommand(guild, message, command) {
  const { vipChatId, vipThreadId, announcementChatId, announcementThreadId } = getTelegramConfig();

  if (command.name === 'approve') {
    if (!isTelegramThreadMatch(message, vipThreadId) || `${message.chat.id}` !== `${vipChatId}`) {
      throw new Error('Use /approve inside the configured VIP review Telegram channel or topic.');
    }

    const caseId = command.args[0];

    if (!caseId) {
      throw new Error('Use /approve <caseId>.');
    }

    return handleTelegramApproveCommand(guild, message, caseId);
  }

  if (command.name === 'deny') {
    if (!isTelegramThreadMatch(message, vipThreadId) || `${message.chat.id}` !== `${vipChatId}`) {
      throw new Error('Use /deny inside the configured VIP review Telegram channel or topic.');
    }

    const caseId = command.args[0];

    if (!caseId) {
      throw new Error('Use /deny <caseId> <reason>.');
    }

    return handleTelegramDenyCommand(guild, message, caseId, command.args.slice(1).join(' '));
  }

  if (command.name === 'moreinfo') {
    if (!isTelegramThreadMatch(message, vipThreadId) || `${message.chat.id}` !== `${vipChatId}`) {
      throw new Error('Use /moreinfo inside the configured VIP review Telegram channel or topic.');
    }

    const caseId = command.args[0];

    if (!caseId) {
      throw new Error('Use /moreinfo <caseId> <details needed>.');
    }

    return handleTelegramMoreInfoCommand(guild, message, caseId, command.args.slice(1).join(' '));
  }

  if (command.name === 'announce') {
    const inAnnouncementTarget = `${message.chat.id}` === `${announcementChatId}`
      && isTelegramThreadMatch(message, announcementThreadId);
    const inVipTarget = `${message.chat.id}` === `${vipChatId}`
      && isTelegramThreadMatch(message, vipThreadId);

    if (!inAnnouncementTarget && !inVipTarget) {
      throw new Error('Use /announce inside the configured Telegram announcement channel or topic.');
    }

    return handleTelegramAnnounceCommand(guild, message, command.argsText);
  }

  return null;
}

async function handleTelegramUpdate(guild, update) {
  const { botToken } = getTelegramConfig();
  const message = update.message;

  if (!message?.text) {
    return;
  }

  if (!isAuthorizedTelegramSource(message)) {
    return;
  }

  const command = parseTelegramCommand(message.text);

  if (!command) {
    return;
  }

  const replyThreadId = getTelegramReplyThreadId(message);

  try {
    const result = await handleTelegramCommand(guild, message, command);

    if (result) {
      await replyToTelegram(botToken, message.chat.id, result, replyThreadId);
    }
  } catch (error) {
    await replyToTelegram(botToken, message.chat.id, error.message, replyThreadId);
  }
}

function startTelegramPolling(guild) {
  const { botToken, pollIntervalMs } = getTelegramConfig();

  if (!botToken) {
    console.log('Telegram bot token not configured; Telegram command polling is disabled.');
    return;
  }

  let nextOffset = 0;
  let polling = false;
  let initialized = false;

  const poll = async () => {
    if (polling) {
      return;
    }

    polling = true;

    try {
      const updates = await fetchTelegramUpdates(botToken, nextOffset);

      if (!initialized) {
        const latestUpdate = updates.at(-1);
        nextOffset = latestUpdate ? latestUpdate.update_id + 1 : nextOffset;
        initialized = true;
        return;
      }

      for (const update of updates) {
        nextOffset = update.update_id + 1;
        await handleTelegramUpdate(guild, update);
      }
    } catch (error) {
      console.error(error);
    } finally {
      polling = false;
    }
  };

  poll().catch((error) => {
    console.error(error);
  });
  setInterval(() => {
    poll().catch((error) => {
      console.error(error);
    });
  }, Math.max(pollIntervalMs, 1000));
  console.log('Telegram command polling started.');
}

async function handleVipCaseAction(interaction) {
  const reviewer = await fetchInteractionMember(interaction);

  if (!isStaffReviewer(reviewer)) {
    await interaction.reply({
      content: 'Only staff can manage VIP transfer cases.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [, action, threadId] = interaction.customId.split(':');
  const thread = await interaction.guild.channels.fetch(threadId);

  if (!thread || !thread.isTextBased()) {
    throw new Error(`Missing VIP support thread: ${threadId}`);
  }

  const currentEmbed = interaction.message.embeds[0];
  const memberValue = getEmbedFieldValue(currentEmbed, 'Member') ?? 'Unknown';
  const threadValue = getEmbedFieldValue(currentEmbed, 'Discord thread') ?? `<#${threadId}>`;
  const telegramMessageId = getEmbedFieldValue(currentEmbed, 'Telegram message ID');
  const relayedToTelegram = telegramMessageId !== null
    || (getEmbedFieldValue(currentEmbed, 'Telegram handoff') ?? '').startsWith(supportTemplate.vipTransfer.telegramSentLabel);

  if (action === 'proof') {
    await interaction.update({
      embeds: [buildVipCaseEmbed({
        threadId,
        memberValue,
        threadValue,
        status: supportTemplate.vipTransfer.proofReceivedStatus,
        telegramStatus: getEmbedFieldValue(currentEmbed, 'Telegram handoff') ?? supportTemplate.vipTransfer.telegramPendingLabel,
        lastAction: `Proof received by ${interaction.user.tag}`,
        telegramMessageId,
      })],
      components: buildVipCaseControlRows(threadId, { relayedToTelegram }),
      files: buildAttachmentFiles(),
    });

    await interaction.followUp({
      content: 'Marked the VIP case as proof received.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === 'relay') {
    if (relayedToTelegram) {
      await interaction.reply({
        content: 'This VIP case has already been sent to Telegram.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { botToken, vipChatId } = getTelegramConfig();

    if (!botToken || !vipChatId) {
      await interaction.reply({
        content: 'Telegram VIP handoff is not configured yet. Set TELEGRAM_BOT_TOKEN and TELEGRAM_VIP_CHAT_ID first.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let sentMessageId;

    try {
      sentMessageId = await sendVipCaseToTelegram({
        thread,
        caseEmbed: currentEmbed,
        actorTag: interaction.user.tag,
      });
    } catch (error) {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      embeds: [buildVipCaseEmbed({
        threadId,
        memberValue,
        threadValue,
        status: getEmbedFieldValue(currentEmbed, 'Status') ?? supportTemplate.vipTransfer.defaultStatus,
        telegramStatus: `${supportTemplate.vipTransfer.telegramSentLabel} by ${interaction.user.tag}`,
        lastAction: `Relayed to Telegram by ${interaction.user.tag}`,
        telegramMessageId: sentMessageId,
      })],
      components: buildVipCaseControlRows(threadId, { relayedToTelegram: true }),
      files: buildAttachmentFiles(),
    });

    await interaction.followUp({
      content: `Sent the VIP case to Telegram as message ${sentMessageId}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === 'complete') {
    await interaction.update({
      embeds: [buildVipCaseEmbed({
        threadId,
        memberValue,
        threadValue,
        status: supportTemplate.vipTransfer.completedStatus,
        telegramStatus: getEmbedFieldValue(currentEmbed, 'Telegram handoff') ?? supportTemplate.vipTransfer.telegramPendingLabel,
        lastAction: `Marked complete by ${interaction.user.tag}`,
        telegramMessageId,
      })],
      components: buildVipCaseControlRows(threadId, { relayedToTelegram }),
      files: buildAttachmentFiles(),
    });

    await interaction.followUp({
      content: 'Marked the VIP case as completed.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  throw new Error(`Unknown VIP case action: ${action}`);
}

async function handleSupportStart(interaction) {
  await interaction.reply({
    content: 'Pick the topic that best matches your issue. I will open a private support thread for you.',
    components: [buildSupportTopicMenu()],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleSupportTopicSelection(interaction) {
  await interaction.deferUpdate();

  if (activeSupportTicketUsers.has(interaction.user.id)) {
    await interaction.editReply({
      content: 'Your support ticket is already being created. If you do not see it in a few seconds, try again once.',
      components: [],
    });
    return;
  }

  activeSupportTicketUsers.add(interaction.user.id);
  let createdThread = null;

  try {
    const member = await fetchInteractionMember(interaction);
    const supportChannel = getSupportDeskChannel(interaction.guild);
    const topic = getSupportTopicConfig(interaction.values[0]);
    const responders = await getSupportResponders(interaction.guild);
    const existingThread = await findExistingSupportThread(supportChannel, interaction.user.id);

    if (existingThread) {
      await existingThread.members.add(interaction.user.id);

      for (const responderId of responders.responderIds) {
        if (responderId === interaction.user.id) {
          continue;
        }

        await existingThread.members.add(responderId);
      }

      await interaction.editReply({
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
    createdThread = thread;

    await thread.members.add(interaction.user.id);

    for (const responderId of responders.responderIds) {
      if (responderId === interaction.user.id) {
        continue;
      }

      await thread.members.add(responderId);
    }

    await thread.send({
      content: `${responders.mention} ${interaction.user} opened a new ${topic.label.toLowerCase()} ticket.`,
      embeds: [buildSupportTicketEmbed(member, topic)],
      files: buildAttachmentFiles(),
      allowedMentions: responders.supportRoleId
        ? { roles: [responders.supportRoleId] }
        : undefined,
    });

    if (topic.key === 'vip') {
      await thread.send({
        content: supportTemplate.vipTransfer.threadNotice,
      });
      await createVipOpsCase(interaction.guild, thread, member);
    }

    await interaction.editReply({
      content: topic.key === 'vip'
        ? `Your VIP transfer ticket is ready: <#${thread.id}>`
        : `Your private support ticket is ready: <#${thread.id}>`,
      components: [],
    });
  } catch (error) {
    if (createdThread) {
      await createdThread.delete('TitanTreasure support ticket setup failed');
    }

    throw error;
  } finally {
    activeSupportTicketUsers.delete(interaction.user.id);
  }
}

async function handleVerificationSubmission(interaction) {
  if (activeVerificationUsers.has(interaction.user.id)) {
    await interaction.reply({
      content: 'Your verification request is already being submitted. Give it a few seconds before trying again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  activeVerificationUsers.add(interaction.user.id);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const member = await fetchInteractionMember(interaction);
    const reviewChannel = getReviewChannel(interaction.guild);
    const answers = {
      titanUserId: getTrimmedInputValue(interaction, 'titanUserId'),
      referralSource: getTrimmedInputValue(interaction, 'referralSource'),
      vipTransfer: getTrimmedInputValue(interaction, 'vipTransfer'),
      notes: getTrimmedInputValue(interaction, 'notes'),
    };

    if (memberHasRoleName(member, verificationTemplate.roleNames.verified)) {
      await interaction.editReply({
        content: 'You are already verified. If you still need VIP help, open a support ticket and choose the VIP transfer topic.',
      });
      return;
    }

    if (!answers.titanUserId || !answers.referralSource || !answers.vipTransfer) {
      await interaction.editReply({
        content: 'Please complete every required verification field before submitting.',
      });
      return;
    }

    const reviewMessage = await reviewChannel.send({
      embeds: [buildSubmissionEmbed(member, answers)],
      components: buildReviewButtons(interaction.user.id),
      files: buildAttachmentFiles(),
    });

    await ensureMemberRole(member, verificationTemplate.roleNames.unverified, true);

    await interaction.editReply({
      content: `Thanks — your verification request is in review. Staff will follow up in <#${reviewChannel.id}> if needed.`,
    });

    console.log(`Queued verification review for ${interaction.user.tag} (${reviewMessage.id}).`);
  } finally {
    activeVerificationUsers.delete(interaction.user.id);
  }
}

async function handleStaffDecision(interaction) {
  const reviewer = await fetchInteractionMember(interaction);

  if (!isStaffReviewer(reviewer)) {
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
    files: buildAttachmentFiles(),
  });

  await interaction.followUp({
    content: approve
      ? `${member.user.tag} has been updated.`
      : `${member.user.tag} remains gated as unverified.`,
    ephemeral: true,
  });
}

async function registerGuildCommands(guild) {
  await guild.commands.set([
    clearChannelCommand.toJSON(),
  ]);
}

async function clearChannelExceptPinned(channel) {
  let deletedCount = 0;

  while (true) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const deletableMessages = [...messages.values()].filter((message) => !message.pinned);

    if (deletableMessages.length === 0) {
      break;
    }

    const bulkDeletable = deletableMessages.filter((message) => (
      (Date.now() - message.createdTimestamp) < (14 * 24 * 60 * 60 * 1000)
    ));
    const individuallyDeletable = deletableMessages.filter((message) => !bulkDeletable.includes(message));

    if (bulkDeletable.length > 0) {
      await channel.bulkDelete(bulkDeletable.map((message) => message.id), true);
      deletedCount += bulkDeletable.length;
    }

    for (const message of individuallyDeletable) {
      await message.delete();
      deletedCount += 1;
    }

    if (deletableMessages.length < 100) {
      break;
    }
  }

  return deletedCount;
}

async function handleClearChannelCommand(interaction) {
  if (!canUseCleanupCommand(interaction.user.id)) {
    await interaction.reply({
      content: 'You are not allowed to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!interaction.channel || !interaction.channel.isTextBased() || !interaction.channel.messages) {
    await interaction.reply({
      content: 'This command can only be used in a text channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const deletedCount = await clearChannelExceptPinned(interaction.channel);
  await interaction.editReply({
    content: `Cleared ${deletedCount} non-pinned message${deletedCount === 1 ? '' : 's'} from <#${interaction.channel.id}>.`,
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
      await registerGuildCommands(guild);
      await syncGuild(guild, serverTemplate, client.user.id);
      await ensureVerificationPanel(guild, client.user.id);
      await ensureSupportPanel(guild, client.user.id);
      if (enableGuildMembersIntent) {
        await backfillJoinGating(guild);
      } else {
        console.log('GuildMembers intent disabled; join gating is limited to verification submissions and staff actions.');
      }
      startTelegramPolling(guild);
      console.log(`TitanTreasure bot ready as ${client.user.tag}.`);
    } catch (error) {
      console.error(error);
    }
  });

  if (enableGuildMembersIntent) {
    client.on('guildMemberAdd', async (member) => {
      try {
        await applyJoinGating(member);
        await sendJoinWelcome(member);
        console.log(`Applied join gating to ${member.user.tag}.`);
      } catch (error) {
        console.error(error);
      }
    });
  }

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'clear-channel') {
          await handleClearChannelCommand(interaction);
        }

        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'verify:start') {
          await interaction.showModal(buildVerificationModal());
          return;
        }

        if (interaction.customId === 'support:start') {
          await handleSupportStart(interaction);
          return;
        }

        if (interaction.customId.startsWith('vipcase:')) {
          await handleVipCaseAction(interaction);
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
      if (isInteractionAcknowledgedError(error)) {
        console.warn(`Skipped already-acknowledged interaction: ${interaction.id}`);
        return;
      }

      console.error(error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'Something went wrong while processing that action.',
            flags: MessageFlags.Ephemeral,
          });
        } catch (replyError) {
          if (isInteractionAcknowledgedError(replyError)) {
            console.warn(`Skipped error reply for already-acknowledged interaction: ${interaction.id}`);
            return;
          }

          throw replyError;
        }
      } else if (interaction.isRepliable() && (interaction.replied || interaction.deferred)) {
        try {
          await interaction.editReply({
            content: 'Something went wrong while processing that action.',
            components: [],
          });
        } catch (replyError) {
          if (!isInteractionAcknowledgedError(replyError)) {
            throw replyError;
          }
        }
      }
    }
  });

  await client.login(token);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
