const { brandAssets, brandPalette, embedThemes } = require('./brand-kit');

const readOnlyDeny = [
  'SendMessages',
  'AddReactions',
  'CreatePublicThreads',
  'CreatePrivateThreads',
  'SendMessagesInThreads',
];

const elevatedReadWriteRoles = ['admin', 'moderator', 'support'];
const discordCommunityCta = 'https://titantreasure.vip/discord';

function makeOverwrites({
  everyoneView = true,
  everyoneSend = false,
  verifiedSend = false,
  unverifiedSend = false,
  vipSend = false,
  elevatedRoles = elevatedReadWriteRoles,
}) {
  const overwrites = [];

  if (everyoneView) {
    overwrites.push({
      target: '@everyone',
      allow: ['ViewChannel', 'ReadMessageHistory'],
      deny: everyoneSend ? [] : readOnlyDeny,
    });
  } else {
    overwrites.push({
      target: '@everyone',
      deny: ['ViewChannel'],
    });
  }

  if (verifiedSend) {
    overwrites.push({
      target: 'verified',
      allow: ['SendMessages', 'AddReactions', 'UseExternalEmojis', 'AttachFiles'],
    });
  }

  if (unverifiedSend) {
    overwrites.push({
      target: 'unverified',
      allow: ['SendMessages', 'AddReactions'],
    });
  } else if (everyoneView && !everyoneSend) {
    overwrites.push({
      target: 'unverified',
      deny: ['SendMessages', 'AddReactions'],
    });
  }

  if (vipSend) {
    overwrites.push({
      target: 'vip',
      allow: ['SendMessages', 'AddReactions', 'UseExternalEmojis', 'AttachFiles'],
    });
  }

  for (const role of elevatedRoles) {
    overwrites.push({
      target: role,
      allow: [
        'ViewChannel',
        'ReadMessageHistory',
        'SendMessages',
        'ManageMessages',
        'EmbedLinks',
        'AttachFiles',
      ],
    });
  }

  return overwrites;
}

const serverTemplate = {
  roles: [
    {
      key: 'admin',
      name: 'Admin',
      color: brandPalette.ember,
      hoist: true,
      mentionable: false,
      permissions: ['Administrator'],
    },
    {
      key: 'moderator',
      name: 'Moderator',
      color: brandPalette.royalGold,
      hoist: true,
      mentionable: false,
      permissions: [
        'ManageChannels',
        'ManageMessages',
        'KickMembers',
        'BanMembers',
        'ModerateMembers',
        'ViewAuditLog',
      ],
    },
    {
      key: 'support',
      name: 'Support',
      color: brandPalette.titanBlue,
      hoist: true,
      mentionable: false,
      permissions: [
        'ManageMessages',
        'ViewChannel',
        'MoveMembers',
        'MuteMembers',
        'DeafenMembers',
      ],
    },
    {
      key: 'vip',
      name: 'VIP',
      color: brandPalette.royalGold,
      hoist: true,
      mentionable: true,
      permissions: [],
    },
    {
      key: 'verified',
      name: 'Verified',
      color: brandPalette.signalGold,
      hoist: false,
      mentionable: false,
      permissions: [],
    },
    {
      key: 'unverified',
      name: 'Unverified',
      color: brandPalette.burntCopper,
      hoist: false,
      mentionable: false,
      permissions: [],
    },
    {
      key: 'announcements',
      name: 'Announcements Ping',
      color: brandPalette.midnightNavy,
      hoist: false,
      mentionable: true,
      permissions: [],
    },
  ],
  categories: [
    {
      name: 'START HERE',
      permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
      channels: [
        {
          name: 'welcome',
          topic: 'High-level welcome and value proposition for new TitanTreasure members.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'welcome',
              pin: true,
              assets: [brandAssets.logos.horizontalLight],
                embed: {
                  title: 'Welcome to TitanTreasure',
                  description: 'Serious players only. Verify, pick your lane, and move fast.',
                  color: embedThemes.welcome,
                  image: brandAssets.logos.horizontalLight.url,
                  fields: [
                  {
                    name: 'Start here',
                    value: '1. Read the rules\n2. Submit verification\n3. Go to `deposit-guide` or `vip-transfer`',
                  },
                  {
                    name: 'After verification',
                    value: 'Community chat, referral and cashback lanes, missions, VIP help, support, and proof feeds all unlock.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'rules-and-faq',
          topic: 'Community rules, conduct expectations, and onboarding FAQ.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'rules-faq',
              pin: true,
                embed: {
                  title: 'Rules & FAQ',
                  description: 'Keep it clean, useful, and premium.',
                  color: embedThemes.policy,
                  fields: [
                  {
                    name: 'Rules',
                    value: '1. No spam or unsolicited promotion.\n2. No abusive behavior.\n3. Keep support questions in the support area.\n4. Follow staff instructions during verification and VIP transfer.',
                  },
                  {
                    name: 'Quick FAQ',
                    value: 'Verify first. Then use the dedicated channels for deposits, VIP transfer, referrals, cashback, and support.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'get-verified',
          topic: 'Verification instructions and role-gating prep for the anti-bail onboarding flow.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'verification',
              pin: true,
        embed: {
          title: 'Verification Flow',
          description: 'Verify once. Unlock the full server.',
          color: embedThemes.verification,
          fields: [
            {
              name: 'Need an account first?',
              value: `[Create your account](${discordCommunityCta})`,
            },
            {
              name: 'Already have an account?',
              value: '[Open settings page](https://titantreasure.com/?modal=my-settings&tab=profile&action=edit) and copy the first unchangeable `User ID` box.',
            },
            {
              name: 'After approval',
              value: 'Community chat, referral and cashback lanes, missions, VIP help, support, and the rest of the server unlock automatically.',
            },
          ],
        },
            },
          ],
        },
      ],
    },
    {
      name: 'ANNOUNCEMENTS',
      permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
      channels: [
        {
          name: 'announcements',
          topic: 'Official launch, campaign, and community-wide announcements.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'announcements-intro',
              pin: true,
              assets: [brandAssets.logos.horizontalDark],
                embed: {
                  title: 'Official Updates',
                  description: 'Launches, major pushes, and high-signal updates only.',
                  color: embedThemes.announcement,
                  image: brandAssets.logos.horizontalDark.url,
                  fields: [
                  {
                    name: 'What belongs here',
                    value: 'Launch updates, big promos, mission drops, and important notices only.',
                  },
                  {
                    name: 'What to expect',
                    value: 'Clean posts, no filler, and a clear next step when action is needed.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'titan-upgrade',
          topic: 'VIP transfer campaign info for players migrating from other communities.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'titan-upgrade',
              pin: true,
                embed: {
                  title: 'Titan Upgrade',
                  description: 'For players moving over from other communities.',
                  color: embedThemes.vip,
                  fields: [
                  {
                    name: 'Who this fits',
                    value: 'Players who want better treatment, faster support, and a smoother onboarding path.',
                  },
                  {
                    name: 'What to expect',
                    value: 'Transfers are still reviewed manually, so this lane keeps the process organized and expectations clear.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'deposit-guide',
          topic: 'Deposit instructions, bonus details, and common first-deposit questions.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'deposit-guide',
              pin: true,
                embed: {
                  title: 'Deposit Guide',
                  description: 'Fast answers for first-deposit questions.',
                  color: embedThemes.deposit,
                  fields: [
                  {
                    name: 'What to check',
                    value: 'Methods, any current bonus logic, what to prepare, and what to do if something does not credit correctly.',
                  },
                  {
                    name: 'Support path',
                    value: 'If something is stuck or transfer-sensitive, use `support-desk` or `vip-transfer` quickly.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'new-games-radar',
          topic: 'Staff-curated feed for featured drops, new games, provider highlights, and discovery moments pulled from the site experience.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'new-games-radar',
              pin: true,
                embed: {
                  title: 'New Games Radar',
                  description: 'New drops, featured providers, and what is worth trying next.',
                  color: embedThemes.announcement,
                  fields: [
                  {
                    name: 'Use this for',
                    value: 'New game drops, provider spotlights, and quick staff picks.',
                  },
                  {
                    name: 'Why it matters',
                    value: 'Fresh discovery gives members a reason to come back between announcements and promos.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'COMMUNITY',
      permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
      channels: [
        {
          name: 'general-chat',
          topic: 'Main player chat for day-to-day conversation and live engagement.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
          seedMessages: [
            {
              key: 'general-chat-intro',
              pin: true,
                embed: {
                  title: 'General Chat',
                  description: 'Main floor for verified members.',
                  color: embedThemes.welcome,
                  fields: [
                  {
                    name: 'Good posts here',
                    value: 'Introductions, quick wins, game talk, questions, and live conversation.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'introductions',
          topic: 'Lightweight introductions to get members talking quickly after verification.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
          seedMessages: [
            {
              key: 'introductions-intro',
              pin: true,
                embed: {
                  title: 'Introductions',
                  description: 'A quick intro helps new members stick.',
                  color: embedThemes.welcome,
                  fields: [
                  {
                    name: 'Starter prompt',
                    value: 'How did you find TitanTreasure, what do you play, and what brought you here?',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'referral-hq',
          topic: 'Referral strategy, leaderboard pushes, and discussion around TitanTreasure invite growth.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
          seedMessages: [
            {
              key: 'referral-hq',
              pin: true,
              assets: [brandAssets.banners.referralCampaignAlt],
                embed: {
                  title: 'Referral HQ',
                  description: 'Referral discussion, momentum, and recognition.',
                  color: embedThemes.announcement,
                  image: brandAssets.banners.referralCampaignAlt.url,
                  fields: [
                  {
                    name: 'What the site shows',
                    value: 'Tiered lifetime commissions that step up from 10% to 30% based on referral count.',
                  },
                  {
                    name: 'Use this channel for',
                    value: 'Referral questions, ideas, weekly pushes, and recognition for real results.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'cashback-club',
          topic: 'XP and cashback progression discussion for members tracking their next tier.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
          seedMessages: [
            {
              key: 'cashback-club',
              pin: true,
                embed: {
                  title: 'Cashback Club',
                  description: 'Track cashback progress and the next tier.',
                  color: embedThemes.deposit,
                  fields: [
                  {
                    name: 'What the site shows',
                    value: 'XP-based cashback tiers ranging from 2% up to 25% on casino net losses.',
                  },
                  {
                    name: 'Use this channel for',
                    value: 'Progress checks, tier jumps, ladder questions, and milestone pushes.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'achievements-and-missions',
          topic: 'Habit-building lane for streaks, milestones, and challenge-style member prompts.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true }),
          seedMessages: [
            {
              key: 'achievements-missions',
              pin: true,
                embed: {
                  title: 'Achievements & Missions',
                  description: 'Streaks, milestones, and simple return triggers.',
                  color: embedThemes.welcome,
                  fields: [
                  {
                    name: 'What the site shows',
                    value: '32 achievements including streaks, first-bet milestones, and wagering goals across multiple game types.',
                  },
                  {
                    name: 'Use this channel for',
                    value: 'Weekly prompts, streak celebrations, and reasons to come back.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'VIP TRANSFER',
      permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true, vipSend: true }),
      channels: [
        {
          name: 'vip-transfer',
          topic: 'Guided VIP migration path and proof-based concierge flow.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true, vipSend: true }),
          seedMessages: [
            {
              key: 'vip-transfer',
              pin: true,
                embed: {
                  title: 'VIP Transfer Concierge',
                  description: 'For players moving over and expecting a smoother transfer experience.',
                  color: embedThemes.vip,
                  fields: [
                  {
                    name: 'What to submit',
                    value: 'VIP proof, your TitanTreasure User ID, treatment expectations, and any useful context.',
                  },
                  {
                    name: 'Current transfer style',
                    value: 'Transfer handling is still manual for now, so this lane keeps the process organized and expectations clear.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'vip-questions',
          topic: 'General questions about VIP treatment, offers, and transfer expectations.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, verifiedSend: true, vipSend: true }),
        },
      ],
    },
    {
      name: 'PROOF & WINS',
      permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
      channels: [
        {
          name: 'big-wins',
          topic: 'Reserved for real-time win proof and momentum-building social proof.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'big-wins',
              pin: true,
                embed: {
                  title: 'Big Wins Feed',
                  description: 'Curated win proof only.',
                  color: embedThemes.proof,
                  fields: [
                  {
                    name: 'Posting standard',
                    value: 'Clean, believable wins only. Quality beats volume here.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'deposit-alerts',
          topic: 'Reserved for deposit confirmations and momentum signals during launch windows.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'deposit-alerts',
              pin: true,
                embed: {
                  title: 'Deposit Alerts Feed',
                  description: 'Clean deposit momentum only.',
                  color: embedThemes.deposit,
                  fields: [
                  {
                    name: 'Posting guidance',
                    value: 'Keep alerts short, consistent, and tied to genuine activity.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'live-wins-recap',
          topic: 'Curated recap lane for staff to summarize the strongest social-proof moments without flooding the server.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: [
            {
              key: 'live-wins-recap',
              pin: true,
                embed: {
                  title: 'Live Wins Recap',
                  description: 'Daily or weekly social-proof recap.',
                  color: embedThemes.proof,
                  fields: [
                  {
                    name: 'Best use',
                    value: 'Summarize standout wins and momentum spikes in a cleaner format than a raw feed.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'SUPPORT',
      permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: true }),
      channels: [
        {
          name: 'support-desk',
          topic: 'General help for onboarding, deposits, verification questions, and account issues.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: true }),
          seedMessages: [
            {
              key: 'support',
              pin: true,
              assets: [brandAssets.banners.genericPromoMobile],
                embed: {
                  title: 'Support Desk',
                  description: 'Fast human help when something is blocking progress.',
                  color: embedThemes.support,
                  image: brandAssets.banners.genericPromoMobile.url,
                  fields: [
                  {
                    name: 'Use cases',
                    value: 'Verification help, deposit issues, VIP transfer questions, or anything blocking action.',
                  },
                  {
                    name: 'Best way to get help',
                    value: 'Use the support ticket button below to open a private case thread with the right topic and staff routing.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'STAFF',
      permissionOverwrites: makeOverwrites({ everyoneView: false }),
      channels: [
        {
          name: 'staff-ops',
          topic: 'Internal operations, launch prep, and execution notes for staff.',
          permissionOverwrites: makeOverwrites({ everyoneView: false }),
        },
        {
          name: 'launch-checklist',
          topic: 'Private staging area for launch tasks, campaign timing, and follow-up notes.',
          permissionOverwrites: makeOverwrites({ everyoneView: false }),
          seedMessages: [
            {
              key: 'launch-checklist',
              pin: true,
                embed: {
                  title: 'Launch Checklist',
                  description: 'Use this as the live staging checklist before promoting the server publicly.',
                  color: embedThemes.announcement,
                  fields: [
                  {
                    name: 'Before opening traffic',
                    value: '1. Confirm bot is online and synced.\n2. Confirm verification panel is pinned and working.\n3. Confirm support ticket panel is pinned and creating threads.\n4. Confirm VIP transfer lane copy is current.',
                  },
                  {
                    name: 'Campaign readiness',
                    value: '1. Finalize announcement copy.\n2. Confirm deposit-guide, titan-upgrade, and proof channels are updated.\n3. Confirm referral and cashback lanes are presentation-ready.',
                  },
                  {
                    name: 'Operational checks',
                    value: '1. Confirm staff know who is handling verification, support, and VIP cases.\n2. Confirm response owner for private tickets.\n3. Confirm launch-day follow-up and proof posting rhythm.',
                  },
                  {
                    name: 'Go-live signal',
                    value: 'Launch only after the onboarding path, support path, and staff handoff path all work cleanly end-to-end.',
                  },
                ],
              },
            },
          ],
        },
        {
          name: 'vip-transfer-ops',
          topic: 'Private queue for manual VIP transfer handling, owner-review prep, and follow-up tracking during the bonus test period.',
          permissionOverwrites: makeOverwrites({ everyoneView: false }),
          seedMessages: [
            {
              key: 'vip-transfer-ops',
              pin: true,
                embed: {
                  title: 'VIP Transfer Ops',
                  description: 'Use this private lane to keep manual VIP transfer handling organized while the bonus amount and approval style are still being tested.',
                  color: embedThemes.vip,
                  fields: [
                  {
                    name: 'Track here',
                    value: 'Prospect status, proof received, owner-review notes, follow-up timing, and whether a transfer is still active, paused, approved, or closed out.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

const verificationTemplate = {
  panelChannelName: 'get-verified',
  reviewChannelName: 'staff-ops',
  staffRoleNames: ['Admin', 'Moderator', 'Support'],
  roleNames: {
    verified: 'Verified',
    unverified: 'Unverified',
    vip: 'VIP',
  },
  panel: {
    key: 'verification-panel',
    buttonLabel: 'Start Verification',
    assets: [brandAssets.logos.horizontal],
                embed: {
                  title: 'Start Verification',
        description: 'Submit your TitanTreasure User ID. Once approved, the full server unlocks.',
        color: embedThemes.verification,
        image: brandAssets.logos.horizontal.url,
        fields: [
        {
          name: 'Need an account first?',
          value: `[Create your account](${discordCommunityCta})`,
        },
        {
          name: 'Already have an account?',
          value: '[Open settings page](https://titantreasure.com/?modal=my-settings&tab=profile&action=edit) and copy the first unchangeable `User ID` box.',
        },
        {
          name: 'After approval',
          value: 'The bot removes `Unverified`, adds `Verified`, and unlocks the rest of the server. VIP can also be granted during review.',
        },
      ],
    },
  },
};

const supportTemplate = {
  panelChannelName: 'support-desk',
  responderUserId: '1153034319271559328',
  panel: {
    key: 'support-panel',
    buttonLabel: 'Create Support Ticket',
    menuPlaceholder: 'Choose what you need help with',
    assets: [brandAssets.banners.genericPromoMobile],
    embed: {
      title: 'Open a Private Support Ticket',
      description: 'Use the button to open a private support thread and route your request faster.',
      color: embedThemes.support,
      image: brandAssets.banners.genericPromoMobile.url,
      fields: [
        {
          name: 'How it works',
          value: '1. Press the button.\n2. Pick the topic.\n3. The bot opens a private thread and tags the response owner.',
        },
        {
          name: 'Good fit',
          value: 'Verification issues, deposit questions, VIP transfer help, account blockers, or anything stopping the next step.',
        },
      ],
    },
  },
  topics: [
    {
      key: 'verification',
      label: 'Verification Help',
      description: 'User ID, approval, role unlock, or access issues.',
      intakePrompt: 'Share your TitanTreasure User ID, what is stuck, and any screenshot that helps staff verify the issue fast.',
    },
    {
      key: 'deposit',
      label: 'Deposit / Bonus Help',
      description: 'Deposit issues, crediting questions, or bonus confusion.',
      intakePrompt: 'Share the deposit method, amount, what happened, and any screenshot or transaction detail that helps staff investigate.',
    },
    {
      key: 'vip',
      label: 'VIP Transfer Help',
      description: 'VIP migration questions, proof, or transfer follow-up.',
      intakePrompt: 'Share your TitanTreasure User ID, current site, VIP status, and what kind of transfer help or follow-up you need.',
    },
    {
      key: 'account',
      label: 'Account / General Support',
      description: 'Login blockers, onboarding issues, or anything else.',
      intakePrompt: 'Describe the blocker clearly, include your TitanTreasure User ID if relevant, and add screenshots if they will speed up support.',
    },
  ],
};

module.exports = { serverTemplate, verificationTemplate, supportTemplate };
