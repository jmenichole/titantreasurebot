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
  playerDescription,
  playerFields,
  assets,
  image,
}) {
  return [
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
            liveNote: 'Keep rules short, clear, and premium. Pair them with a simple channel map so members know exactly where feedback, bugs, feature ideas, VIP help, and support requests belong.',
            playerDescription: 'Clean standards.\nClear channel map.\nFaster routing.',
            playerFields: [
              {
                name: 'Ground rules',
                value: '• No spam\n• No abuse\n• Use the right lane for support, verification, or VIP help',
              },
              {
                name: 'Start here',
                value: '• `get-verified` - unlock access\n• `deposit-guide` - payment and redemption info\n• `support-desk` - private help and VIP transfer tickets',
              },
              {
                name: 'Community channels',
                value: '• `vip-questions` - general VIP questions\n• `referral-hq` - referral talk\n• `giveaways-and-bonus-codes` - promo drops\n• `contests-and-challenges` - participation pushes\n• `big-wins` - standout win posts',
              },
              {
                name: 'Feedback and fixes',
                value: 'Use `support-desk` and choose the ticket topic for:\n• Feedback\n• Bug Report\n• Feature Request / Suggestion',
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
            title: 'Hacksaw Games Are Now Live',
            color: embedThemes.announcement,
            value: 'This channel should highlight real launches and meaningful updates in a way that feels immediate, premium, and worth checking right away.',
            liveNote: 'Use the live embed to announce that Hacksaw provider games are now live on the site with one short excitement hook.',
            playerDescription: 'Hacksaw provider games are now live on TitanTreasure.',
            playerFields: [
              {
                name: 'Live now',
                value: 'Hacksaw titles are now available on the site.',
              },
              {
                name: 'Why check in',
                value: 'Fresh provider drops give you more variety, quicker discovery, and more reasons to jump back in.',
              },
            ],
            assets: [brandAssets.logos.horizontalDark],
            image: brandAssets.logos.horizontalDark.url,
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
            value: 'This channel should reduce payment friction by showing what redemption options are live now and what additional methods are on the way.',
            liveNote: 'Keep the live copy practical and current: bank account redemption is already live, debit card redemption was added, and Apple Pay plus Skrill are in progress.',
            playerDescription: 'Current redemption options are live now, with more payment flexibility on the way.',
            playerFields: [
              {
                name: 'Available now',
                value: 'Bank account redemption is already available, and debit card redemption has now been added.',
              },
              {
                name: 'Coming next',
                value: 'Apple Pay and Skrill are currently being integrated.',
              },
              {
                name: 'Need help?',
                value: 'Use `support-desk` for fast help if anything with payment or redemption needs a staff check.',
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
          name: 'giveaways-and-bonus-codes',
          topic: 'Promo code drops, giveaway updates, and bonus-related community pushes.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'giveaways-bonus-codes',
            title: 'Giveaways & Bonus Codes',
            color: embedThemes.deposit,
            value: 'This is the promotional reward lane. It should keep members checking back for giveaway drops, code updates, and bonus-driven momentum.',
            liveNote: 'Keep the copy focused on giveaway activity, promo codes, and quick-hit reward energy.',
            playerDescription: 'Giveaway drops and bonus code updates in one place.',
            playerFields: [
              {
                name: 'Use this for',
                value: 'Giveaway announcements, code drops, bonus reminders, and limited reward pushes.',
              },
              {
                name: 'Why it matters',
                value: 'Fast reward updates give members more reasons to stay active and check in often.',
              },
            ],
          }),
        },
        {
          name: 'contests-and-challenges',
          topic: 'Community contests, challenge prompts, and participation-driven events.',
          permissionOverwrites: makeOverwrites({ everyoneView: false, verifiedSend: true }),
          seedMessages: seedPair({
            key: 'contests-challenges',
            title: 'Contests & Challenges',
            color: embedThemes.welcome,
            value: 'This is the participation lane. It should create recurring reasons to join events, compete lightly, and stay active in the community.',
            liveNote: 'Frame it around contest energy, simple challenge hooks, and reasons to jump in without friction.',
            playerDescription: 'Community contests and challenge drops that keep things active.',
            playerFields: [
              {
                name: 'What belongs here',
                value: 'Trivia pushes, challenge posts, contest rules, participation prompts, and winner callouts.',
              },
              {
                name: 'Why it matters',
                value: 'Ongoing challenges turn passive members into active regulars.',
              },
            ],
          }),
        },
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
          topic: 'General help for onboarding, deposits, verification questions, account issues, and private ticket routing.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: true }),
          seedMessages: seedPair({
            key: 'support',
            title: 'Support Desk',
            color: embedThemes.support,
            value: 'This is the blocker-removal lane. It exists to catch friction quickly so users do not stall out between verification, deposit, VIP, or account steps.',
            liveNote: 'Keep the message short: fast help, clear use cases, and one obvious action through the ticket button. Make it clear VIP transfers are completed through a support ticket now.',
            playerDescription: 'Fast private help when something is blocking progress.',
            playerFields: [
              {
                name: 'Use it for',
                value: 'Verification issues, deposit questions, VIP transfer help, feedback, bug reports, feature suggestions, or any blocker that needs staff support.',
              },
              {
                name: 'Best way to get help',
                value: 'Use the support ticket button below to open a private case thread with the right topic and staff routing. VIP transfers are completed there as well.',
              },
            ],
            assets: [brandAssets.banners.genericPromoMobile],
            image: brandAssets.banners.genericPromoMobile.url,
          }),
        },
        {
          name: 'vip-questions',
          topic: 'General questions about VIP treatment, transfer expectations, and support-ticket next steps.',
          permissionOverwrites: makeOverwrites({ everyoneView: true, everyoneSend: false }),
          seedMessages: seedPair({
            key: 'vip-questions',
            title: 'VIP Questions',
            color: embedThemes.vip,
            value: 'This is the lighter VIP education lane. It exists so people can understand the VIP path before opening a private support ticket.',
            liveNote: 'Explain that this channel is for general VIP questions only, and that completed VIP transfers now happen through a support ticket.',
            playerDescription: 'General VIP questions first. Open a support ticket when you are ready to complete a transfer.',
            playerFields: [
              {
                name: 'Best for',
                value: 'Clarifying VIP treatment, transfer expectations, and whether this path fits your situation.',
              },
              {
                name: 'Ready to transfer?',
                value: 'Go to `support-desk`, create a private ticket, and choose the VIP transfer help topic to complete the process.',
              },
            ],
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
            {
              key: 'staff-ops-live',
              pin: true,
              embed: {
                title: 'Staff Ops',
                description: 'Private staff lane for live coordination, decisions, and internal follow-through.',
                color: embedThemes.announcement,
                fields: [
                  {
                    name: 'Use this for',
                    value: 'Internal direction, assignment handoff, launch notes, and real-time staff coordination.',
                  },
                ],
              },
            },
            {
              key: 'staff-trivia-ops-guide',
              pin: true,
              embed: {
                title: 'Trivia Ops Guide',
                description: 'Website-first trivia; Discord is the announcement and traffic layer.',
                color: embedThemes.announcement,
                fields: [
                  {
                    name: 'Before a round',
                    value: 'Create and verify the round in the external trivia service. Confirm the Discord trivia lane is ready for traffic and that members will be sent to the website to play.',
                  },
                  {
                    name: 'When live',
                    value: 'The trivia service should push the live announcement into Discord automatically. Staff monitor the channel, answer basic questions, and redirect blockers to `support-desk`.',
                  },
                  {
                    name: 'After a round',
                    value: 'Confirm the results or winners announcement posts correctly. Add a short follow-up message only if staff need to celebrate winners or point members to the next round.',
                  },
                  {
                    name: 'If automation fails',
                    value: 'Do not run the game in chat. Check the trivia service event first, then the bot or webhook status, and post a temporary manual link only if needed.',
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
    'titan-upgrade',
    'new-games-radar',
    'introductions',
    'cashback-club',
    'achievements-and-missions',
    'vip-transfer',
    'launch-checklist',
  ],
  retiredCategories: [
    'PROOF & WINS',
    'VIP TRANSFER',
    'WINS',
  ],
};

const verificationTemplate = {
  panelChannelName: 'get-verified',
  reviewChannelName: 'staff-ops',
  onboardingChannelId: '1496022021253894196',
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
  joinExperience: {
    landingMessage: 'Welcome to TitanTreasure, {member}. Start in <#{channelId}> and check your DMs for the fastest setup path.',
    dm: {
      assets: [brandAssets.logos.horizontal],
      embed: {
        title: 'Welcome to TitanTreasure',
        description: 'Here is the fastest path to get fully set up without guesswork.',
        color: embedThemes.welcome,
        image: brandAssets.logos.horizontal.url,
        fields: [
          {
            name: '1. Start here',
            value: 'Go to <#{channelId}> first. That is the main bot and onboarding lane for new members.',
          },
          {
            name: '2. Get verified',
            value: 'Open `get-verified`, press **Start Verification**, and submit your TitanTreasure User ID from your site settings.',
          },
          {
            name: '3. Need help?',
            value: 'Use `support-desk` if anything is confusing, blocked, or needs a staff check.',
          },
          {
            name: '4. What unlocks next',
            value: 'After approval, the bot gives you access to the full community, support lanes, and VIP routing when needed.',
          },
        ],
      },
    },
  },
};

const supportTemplate = {
  panelChannelName: 'support-desk',
  responderUserId: '1153034319271559328',
  responderRoleName: 'Support',
  vipTransfer: {
    opsChannelName: 'vip-transfer-ops',
    announceChannelName: 'announcements',
    defaultStatus: 'Awaiting player proof',
    proofReceivedStatus: 'Proof received in Discord',
    moreInfoStatus: 'Waiting for more info from player',
    deniedStatus: 'Denied',
    approvedStatus: 'Approved',
    completedStatus: 'Completed',
    telegramPendingLabel: 'Not sent yet',
    telegramSentLabel: 'Sent to Telegram',
    opsMessage: {
      title: 'VIP Transfer Case',
      description: 'Internal staff tracker for a VIP transfer request opened from Discord support.',
    },
    controls: {
      markProofReceivedLabel: 'Mark Proof Received',
      relayToTelegramLabel: 'Send to Telegram',
      markCompleteLabel: 'Mark Complete',
    },
    threadNotice: 'Staff tracking has started for this VIP transfer. Send your current site, VIP tier, screenshots, and any transfer proof here so the handoff can be completed cleanly.',
    telegram: {
      handoffTitle: 'TitanTreasure VIP Transfer Handoff',
      readyStatus: 'Ready for owner review',
      transcriptFallback: 'No member follow-up has been posted in the Discord thread yet.',
      commands: {
        chatId: '/chatid',
        approve: '/approve <caseId>',
        deny: '/deny <caseId> <reason>',
        moreInfo: '/moreinfo <caseId> <details needed>',
        announce: '/announce <message>',
      },
    },
  },
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
          value: 'Verification issues, deposit questions, VIP transfer completion, feedback, bug reports, feature suggestions, account blockers, or anything stopping the next step.',
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
      description: 'Complete a VIP transfer, submit proof, or request follow-up.',
      intakePrompt: 'Share your TitanTreasure User ID, current site, VIP status, transfer proof, and anything staff need to complete the VIP transfer cleanly.',
    },
    {
      key: 'account',
      label: 'Account / General Support',
      description: 'Login blockers, onboarding issues, or anything else.',
      intakePrompt: 'Describe the blocker clearly, include your TitanTreasure User ID if relevant, and add screenshots if they will speed up support.',
    },
    {
      key: 'feedback',
      label: 'Feedback',
      description: 'Player feedback on flows, features, or overall experience.',
      intakePrompt: 'Share what you liked or disliked, what happened, and what would make the experience smoother for you.',
    },
    {
      key: 'bug-report',
      label: 'Bug Report',
      description: 'Something is broken, glitched, or not working as expected.',
      intakePrompt: 'Describe the bug clearly, include what you were trying to do, what happened instead, and add screenshots or steps to reproduce if possible.',
    },
    {
      key: 'feature-request',
      label: 'Feature Request / Suggestion',
      description: 'Ideas for new features, improvements, or quality-of-life changes.',
      intakePrompt: 'Describe the idea, why it would help, and what problem or friction it would solve for you.',
    },
  ],
};

module.exports = { serverTemplate, verificationTemplate, supportTemplate };
