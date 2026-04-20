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
  verifiedView = verifiedSend,
  unverifiedSend = false,
  vipSend = false,
  vipView = vipSend,
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

  if (verifiedView || verifiedSend) {
    const verifiedAllow = ['ViewChannel', 'ReadMessageHistory'];

    if (verifiedSend) {
      verifiedAllow.push('SendMessages', 'AddReactions', 'UseExternalEmojis', 'AttachFiles');
    }

    overwrites.push({
      target: 'verified',
      allow: verifiedAllow,
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

  if (vipView || vipSend) {
    const vipAllow = ['ViewChannel', 'ReadMessageHistory'];

    if (vipSend) {
      vipAllow.push('SendMessages', 'AddReactions', 'UseExternalEmojis', 'AttachFiles');
    }

    overwrites.push({
      target: 'vip',
      allow: vipAllow,
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

function ownerSeed({ key, title, color, value, liveNote }) {
  return {
    key: `${key}-owner`,
    pin: false,
    embed: {
      title: `${title} • Owner View`,
      description: 'Internal walkthrough note. This explains the business purpose and should be deleted before opening the server.',
      color,
      fields: [
        {
          name: 'Business purpose',
          value,
        },
        {
          name: 'Live copy goal',
          value: liveNote,
        },
      ],
    },
  };
}

function playerSeed({
  key,
  title,
  description,
  color,
  fields,
  assets,
  image,
}) {
  return {
    key,
    pin: true,
    ...(assets ? { assets } : {}),
    embed: {
      title,
      description,
      color,
      ...(image ? { image } : {}),
      fields,
    },
  };
}

function seedPair({
  key,
  title,
  color,
  value,
  liveNote,
  playerDescription,
  playerFields,
  assets,
  image,
}) {
  return [
    ownerSeed({
      key,
      title,
      color,
      value,
      liveNote,
    }),
    playerSeed({
      key,
      title,
      description: playerDescription,
      color,
      fields: playerFields,
      assets,
      image,
    }),
  ];
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
          seedMessages: seedPair({
            key: 'welcome',
            title: 'Welcome to TitanTreasure',
            color: embedThemes.welcome,
            value: 'This is the first impression channel. It should make the server feel premium fast, show the next step clearly, and move serious users into verification without friction.',
            liveNote: 'Short value statement, fast-start path, and clear mention that verification unlocks the rest of the experience.',
            playerDescription: 'Premium onboarding. Fast verification. Clear next step.',
            playerFields: [
              {
                name: 'Start here',
                value: '1. Read the rules\n2. Submit verification\n3. Use deposit, VIP, or support lanes as needed',
              },
              {
                name: 'What opens next',
                value: 'Chat, referral, cashback, missions, support, and VIP channels unlock after approval.',
              },
            ],
            assets: [brandAssets.logos.horizontalLight],
            image: brandAssets.logos.horizontalLight.url,
          }),
        },
        {
          name: 'rules-and-faq',
          topic: 'Community rules, conduct expectations, and onboarding FAQ.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'rules-faq',
            title: 'Rules & FAQ',
            color: embedThemes.policy,
            value: 'This channel protects tone and trust. It should communicate that the server is clean, controlled, and easy to navigate without sounding heavy-handed.',
            liveNote: 'Keep rules short, clear, and premium. Pair them with one simple explanation of where members should go next.',
            playerDescription: 'Clean standards. Faster trust. Clear support path.',
            playerFields: [
              {
                name: 'Ground rules',
                value: 'No spam. No abuse. Use the right lane for support, verification, or VIP help.',
              },
              {
                name: 'Quick answer',
                value: 'Verify first, then use the dedicated channels for deposits, VIP transfer, referrals, cashback, and support.',
              },
            ],
          }),
        },
        {
          name: 'get-verified',
          topic: 'Verification instructions and role-gating prep for the anti-bail onboarding flow.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'verification',
            title: 'Verification Flow',
            color: embedThemes.verification,
            value: 'This is the conversion gate. It should make verification feel fast, legitimate, and worth completing because it unlocks the real value of the server.',
            liveNote: 'Show the exact action, explain where to find the User ID, and make the unlock benefit obvious in one glance.',
            playerDescription: 'One fast check. Full access after approval.',
            playerFields: [
              {
                name: 'Need an account first?',
                value: `[Create your account](${discordCommunityCta})`,
              },
              {
                name: 'Already have an account?',
                value: '[Open settings](https://titantreasure.com/?modal=my-settings&tab=profile&action=edit) and copy the first unchangeable `User ID` field.',
              },
              {
                name: 'After approval',
                value: 'The bot unlocks the rest of the server and staff can add VIP during review when needed.',
              },
            ],
          }),
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
          seedMessages: seedPair({
            key: 'announcements-intro',
            title: 'Official Updates',
            color: embedThemes.announcement,
            value: 'This is the high-signal broadcast lane. It should make launches, offers, and key updates easy to trust and easy to act on.',
            liveNote: 'Keep every announcement short, valuable, and tied to one obvious next step.',
            playerDescription: 'High-signal launches, promos, and important updates only.',
            playerFields: [
              {
                name: 'What belongs here',
                value: 'Launch drops, major promos, mission pushes, and important notices.',
              },
              {
                name: 'What to expect',
                value: 'Clean posts, no filler, and a clear action when something matters.',
              },
            ],
            assets: [brandAssets.logos.horizontalDark],
            image: brandAssets.logos.horizontalDark.url,
          }),
        },
        {
          name: 'titan-upgrade',
          topic: 'VIP transfer campaign info for players migrating from other communities.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'titan-upgrade',
            title: 'Titan Upgrade',
            color: embedThemes.vip,
            value: 'This is the migration offer lane. It should communicate better treatment, smoother onboarding, and a cleaner path for higher-value players moving over.',
            liveNote: 'Focus on upgrade value, clear expectations, and where to ask questions or start the process.',
            playerDescription: 'Concierge-style VIP migration with clearer expectations and cleaner follow-through.',
            playerFields: [
              {
                name: 'Best fit',
                value: 'Players looking for better treatment, faster support, and a more organized onboarding path.',
              },
              {
                name: 'How it works',
                value: 'Use `vip-transfer` to start the process or `vip-questions` if you want clarity before opening a case.',
              },
            ],
          }),
        },
        {
          name: 'deposit-guide',
          topic: 'Deposit instructions, bonus details, and common first-deposit questions.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'deposit-guide',
            title: 'Deposit Guide',
            color: embedThemes.deposit,
            value: 'This channel reduces first-deposit confusion and support drag. It should answer the most important pre-deposit questions in one fast read.',
            liveNote: 'Keep the copy practical: what to prepare, what to expect, and where to go if something stalls.',
            playerDescription: 'Fast deposit clarity without the back-and-forth.',
            playerFields: [
              {
                name: 'What to check first',
                value: 'Deposit method, bonus terms, and what to prepare before you start.',
              },
              {
                name: 'If something is stuck',
                value: 'Use `support-desk` for help fast, or `vip-transfer` if the issue is VIP or transfer-related.',
              },
            ],
          }),
        },
        {
          name: 'new-games-radar',
          topic: 'Staff-curated feed for featured drops, new games, provider highlights, and discovery moments pulled from the site experience.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'new-games-radar',
            title: 'New Games Radar',
            color: embedThemes.announcement,
            value: 'This channel gives members fresh reasons to come back between promos. It supports retention through discovery, novelty, and quick curated picks.',
            liveNote: 'Keep it focused on new drops, featured providers, and simple reasons to click through.',
            playerDescription: 'Fresh drops, featured providers, and quick picks worth checking next.',
            playerFields: [
              {
                name: 'Use this for',
                value: 'New games, provider highlights, and staff picks worth trying.',
              },
              {
                name: 'Why it matters',
                value: 'Fresh discovery keeps the server active between bigger announcements and promos.',
              },
            ],
          }),
        },
      ],
    },
    {
      name: 'COMMUNITY',
      permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
      channels: [
        {
          name: 'general-chat',
          topic: 'Main player chat for day-to-day conversation and live engagement.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'general-chat-intro',
            title: 'General Chat',
            color: embedThemes.welcome,
            value: 'This is the main activity floor. It exists to create day-to-day conversation, retention, and visible community energy after verification.',
            liveNote: 'Keep it simple: this is the main chat lane for verified members.',
            playerDescription: 'Verified-only chat for day-to-day momentum.',
            playerFields: [
              {
                name: 'Use it for',
                value: 'Introductions, game talk, quick wins, questions, and day-to-day conversation.',
              },
            ],
          }),
        },
        {
          name: 'introductions',
          topic: 'Lightweight introductions to get members talking quickly after verification.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'introductions-intro',
            title: 'Introductions',
            color: embedThemes.welcome,
            value: 'This channel helps newly verified members post something fast, which increases the chance they become active instead of disappearing after onboarding.',
            liveNote: 'Make the first post easy. One short intro prompt is enough.',
            playerDescription: 'A fast intro helps you plug in quickly.',
            playerFields: [
              {
                name: 'Starter prompt',
                value: 'How did you find TitanTreasure, what do you play, and what brought you here?',
              },
            ],
          }),
        },
        {
          name: 'referral-hq',
          topic: 'Referral strategy, leaderboard pushes, and discussion around TitanTreasure invite growth.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'referral-hq',
            title: 'Referral HQ',
            color: embedThemes.announcement,
            value: 'This is the monetization and invite-growth lane. It should make the referral system feel visible, rewarding, and worth pushing.',
            liveNote: 'Keep the focus on referral value, growth momentum, and recognition for results.',
            playerDescription: 'Referral growth, recognition, and creator momentum.',
            playerFields: [
              {
                name: 'What the site shows',
                value: 'Tiered lifetime commissions that increase from 10% up to 30% based on referral count.',
              },
              {
                name: 'Use this channel for',
                value: 'Referral questions, ideas, milestone pushes, and recognition.',
              },
            ],
            assets: [brandAssets.banners.referralCampaignAlt],
            image: brandAssets.banners.referralCampaignAlt.url,
          }),
        },
        {
          name: 'cashback-club',
          topic: 'XP and cashback progression discussion for members tracking their next tier.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'cashback-club',
            title: 'Cashback Club',
            color: embedThemes.deposit,
            value: 'This channel supports retention by keeping cashback progress visible and giving members a reason to care about the next tier.',
            liveNote: 'Position it as progression value: track tiers, understand XP, and stay engaged.',
            playerDescription: 'Track tier progress and stay on the ladder.',
            playerFields: [
              {
                name: 'What the site shows',
                value: 'XP-based cashback tiers ranging from 2% up to 25% on casino net losses.',
              },
              {
                name: 'Use this channel for',
                value: 'Progress checks, tier jumps, ladder questions, and milestone pushes.',
              },
            ],
          }),
        },
        {
          name: 'achievements-and-missions',
          topic: 'Habit-building lane for streaks, milestones, and challenge-style member prompts.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'achievements-missions',
            title: 'Achievements & Missions',
            color: embedThemes.welcome,
            value: 'This is a habit and retention lane. It keeps members returning by making progress, streaks, and milestones feel visible and rewarding.',
            liveNote: 'Keep it focused on streaks, milestone energy, and simple reasons to come back.',
            playerDescription: 'Streaks, milestones, and easy reasons to return.',
            playerFields: [
              {
                name: 'What the site shows',
                value: 'Achievements for streaks, first-bet milestones, and wagering goals across multiple game types.',
              },
              {
                name: 'Use this channel for',
                value: 'Weekly prompts, streak celebrations, and milestone pushes.',
              },
            ],
          }),
        },
      ],
    },
    {
      name: 'VIP TRANSFER',
      permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true, vipSend: true }),
      channels: [
        {
          name: 'vip-transfer',
          topic: 'Guided VIP migration path and proof-based concierge flow.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true, vipSend: true }),
          seedMessages: seedPair({
            key: 'vip-transfer',
            title: 'VIP Transfer Concierge',
            color: embedThemes.vip,
            value: 'This is the structured concierge lane for higher-value migration. It should make the transfer path feel organized, trust-building, and worth completing.',
            liveNote: 'Communicate upgrade value, proof expectations, and a clear next step without sounding complicated.',
            playerDescription: 'High-touch VIP migration support with organized follow-through.',
            playerFields: [
              {
                name: 'What to prepare',
                value: 'Your TitanTreasure User ID, current site details, VIP proof, and any useful context.',
              },
              {
                name: 'What happens next',
                value: 'Staff review the case, collect anything missing, and keep the process organized from there.',
              },
            ],
          }),
        },
        {
          name: 'vip-questions',
          topic: 'General questions about VIP treatment, offers, and transfer expectations.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true, vipSend: true }),
          seedMessages: seedPair({
            key: 'vip-questions',
            title: 'VIP Questions',
            color: embedThemes.vip,
            value: 'This is the lighter VIP education lane. It exists so people can ask general questions before opening a full transfer or support case.',
            liveNote: 'Explain that this channel is for general VIP questions, while `vip-transfer` is the actual intake lane for action.',
            playerDescription: 'General VIP questions before you open a full transfer case.',
            playerFields: [
              {
                name: 'Best for',
                value: 'Clarifying VIP treatment, transfer expectations, and whether this path fits your situation.',
              },
              {
                name: 'Use `vip-transfer` when',
                value: 'You are ready to submit proof, provide details, and start the actual transfer process.',
              },
            ],
          }),
        },
      ],
    },
    {
      name: 'WINS',
      permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
      channels: [
        {
          name: 'big-wins',
          topic: 'Reserved for real-time win proof and momentum-building social proof.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'big-wins',
            title: 'Big Wins',
            color: embedThemes.proof,
            value: 'This is the community social-proof lane. It exists to let verified members share standout wins and keep momentum visible in a natural way.',
            liveNote: 'Keep it simple: share real wins, keep it believable, and let the channel create positive energy.',
            playerDescription: 'Share real standout wins and keep the energy high.',
            playerFields: [
              {
                name: 'What to post',
                value: 'Big wins, standout moments, and clean screenshots worth sharing.',
              },
              {
                name: 'Keep it clean',
                value: 'Quality beats volume. Real wins only.',
              },
            ],
          }),
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
          seedMessages: seedPair({
            key: 'support',
            title: 'Support Desk',
            color: embedThemes.support,
            value: 'This is the blocker-removal lane. It exists to catch friction quickly so users do not stall out between verification, deposit, VIP, or account steps.',
            liveNote: 'Keep the message short: fast help, clear use cases, and one obvious action through the ticket button.',
            playerDescription: 'Fast private help when something is blocking progress.',
            playerFields: [
              {
                name: 'Use it for',
                value: 'Verification issues, deposit questions, VIP transfer help, or any blocker that needs staff support.',
              },
              {
                name: 'Best way to get help',
                value: 'Use the support ticket button below to open a private case thread with the right topic and staff routing.',
              },
            ],
            assets: [brandAssets.banners.genericPromoMobile],
            image: brandAssets.banners.genericPromoMobile.url,
          }),
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
          seedMessages: [
            ownerSeed({
              key: 'staff-ops',
              title: 'Staff Ops',
              color: embedThemes.announcement,
              value: 'This is the private command lane for execution, decisions, and internal coordination once the server is live.',
              liveNote: 'Use it for internal direction, real-time ops notes, and anything that should not be public.',
            }),
          ],
        },
        {
          name: 'launch-checklist',
          topic: 'Private staging area for launch tasks, campaign timing, and follow-up notes.',
          permissionOverwrites: makeOverwrites({ everyoneView: false }),
          seedMessages: [
            ownerSeed({
              key: 'launch-checklist',
              title: 'Launch Checklist',
              color: embedThemes.announcement,
              value: 'This is the private readiness board for the walkthrough and launch. It makes sure the public-facing flow is clean before traffic gets pushed in.',
              liveNote: 'Keep the checklist practical: bot, panels, copy, staffing, and launch-day follow-through.',
            }),
            {
              key: 'launch-checklist-live',
              pin: true,
              embed: {
                title: 'Launch Checklist',
                description: 'Use this private checklist before promoting the server publicly.',
                color: embedThemes.announcement,
                fields: [
                  {
                    name: 'Before opening traffic',
                    value: '1. Bot online and synced\n2. Verification panel pinned and working\n3. Support ticket panel creating threads\n4. VIP lane copy current',
                  },
                  {
                    name: 'Campaign readiness',
                    value: '1. Announcement copy finalized\n2. Deposit, VIP, and referral lanes updated\n3. Walkthrough path presentation-ready',
                  },
                  {
                    name: 'Operational checks',
                    value: '1. Staff roles clear\n2. Response owner confirmed\n3. Launch-day follow-up rhythm clear',
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
            ownerSeed({
              key: 'vip-transfer-ops',
              title: 'VIP Transfer Ops',
              color: embedThemes.vip,
              value: 'This is the internal queue for higher-touch VIP transfer handling while the workflow and bonus logic are still being refined.',
              liveNote: 'Use it to track proof, handoff status, owner review notes, and whether a case is active, paused, approved, or closed.',
            }),
            {
              key: 'vip-transfer-ops-live',
              pin: true,
              embed: {
                title: 'VIP Transfer Ops',
                description: 'Private queue for VIP transfer case tracking and owner-review prep.',
                color: embedThemes.vip,
                fields: [
                  {
                    name: 'Track here',
                    value: 'Case status, proof received, owner review notes, follow-up timing, and final outcome.',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
  retiredChannels: [
    'deposit-alerts',
    'live-wins-recap',
  ],
  retiredCategories: [
    'PROOF & WINS',
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
        description: 'Submit your TitanTreasure User ID once. Approval unlocks the full server.',
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
          value: 'The bot removes `Unverified`, adds `Verified`, and unlocks the premium member areas. VIP can also be granted during review.',
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
          value: '1. Press the button.\n2. Pick the topic.\n3. The bot opens a private thread and routes it to the response owner.',
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
