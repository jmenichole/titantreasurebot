const brandPalette = Object.freeze({
  royalGold: '#FFBA19',
  signalGold: '#F7B31F',
  midnightNavy: '#07193D',
  titanBlue: '#052967',
  ember: '#CB4F00',
  burntCopper: '#973300',
  warmWhite: '#FFFFFF',
});

const embedThemes = Object.freeze({
  welcome: brandPalette.royalGold,
  policy: brandPalette.titanBlue,
  verification: brandPalette.royalGold,
  announcement: brandPalette.midnightNavy,
  vip: brandPalette.ember,
  deposit: brandPalette.signalGold,
  proof: brandPalette.royalGold,
  support: brandPalette.titanBlue,
});

const brandVoice = Object.freeze({
  positioning: 'Premium gaming community with concierge-style onboarding, fast trust-building, and high-signal conversion flows.',
  tone: [
    'Confident and premium, not loud or spammy',
    'Trust-first and friction-reducing during onboarding',
    'VIP-forward when speaking to migrating or high-value players',
    'Operationally clear when explaining verification, deposits, or support paths',
  ],
});

const brandAssets = Object.freeze({
  logos: {
    square: {
      path: 'Logos-20260420T132237Z-3-001\\Logos\\mobile\\Square (1_1).png',
      recommendedUse: 'Discord server icon, square promotional tiles, and profile-style brand placements.',
    },
    horizontal: {
      path: 'Logos-20260420T132237Z-3-001\\Logos\\mobile\\Horizontal (1_3).png',
      recommendedUse: 'Announcement headers, partner collateral, and wide-format hero placements.',
    },
  },
  banners: {
    mainDesktop: {
      path: 'Banners-20260420T132232Z-3-001\\Banners\\Main Banner_desktop.jpg',
      recommendedUse: 'Primary hero image for desktop community promotions and server launch announcements.',
    },
    mainMobile: {
      path: 'Banners-20260420T132232Z-3-001\\Banners\\Main Banner_Mobile.png',
      recommendedUse: 'Mobile-first companion to the main launch banner.',
    },
    referralCampaign: {
      path: 'Banners-20260420T132232Z-3-001\\Banners\\refer-a-friend1.jpg',
      recommendedUse: 'Referral, invite, ambassador, and friend-to-friend acquisition campaigns.',
    },
    registrationBanner: {
      path: 'Banners-20260420T132232Z-3-001\\Banners\\Reg form banner.png',
      recommendedUse: 'Registration or account-creation callouts when explaining the join flow.',
    },
  },
});

const channelPurpose = Object.freeze({
  'START HERE': 'Reduce onboarding friction, set expectations, and push serious users into verification quickly.',
  ANNOUNCEMENTS: 'Broadcast only high-signal launches, campaigns, and monetization pushes.',
  COMMUNITY: 'Turn verified members into active regulars through lightweight conversation and social momentum.',
  'VIP TRANSFER': 'Run a concierge migration lane for high-value players moving from other communities.',
  'PROOF & WINS': 'Build trust and FOMO with curated proof, wins, and deposit momentum.',
  SUPPORT: 'Resolve blockers that prevent conversion, retention, or VIP trust.',
  STAFF: 'Coordinate internal execution, reviews, and launch operations.',
});

module.exports = {
  brandAssets,
  brandPalette,
  brandVoice,
  channelPurpose,
  embedThemes,
};
