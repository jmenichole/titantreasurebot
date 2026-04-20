# TitanTreasure Copilot Instructions

## Commands

| Task | Command | Notes |
| --- | --- | --- |
| Start the long-running bot | `npm start` | Runs `node bot.js`. This is also the Railway `startCommand`. |
| Run one-time guild provisioning | `npm run bootstrap` | Runs `node bootstrap.js` to sync roles, categories, channels, and seeded embeds, then exits. |
| Run the existing test suite | `npm test` | Syntax-checks `bootstrap.js`, `bot.js`, `discord-provisioning.js`, and `server-template.js` with `node --check`. |
| Run a single file check | `node --check bot.js` | Use the same pattern for `bootstrap.js`, `discord-provisioning.js`, or `server-template.js`. |

There is no dedicated build or lint script in `package.json`.

## High-level architecture

This repository is a small CommonJS Node 20+ Discord automation project with two entrypoints:

- `bootstrap.js` is the one-shot provisioner. It logs into Discord, fetches the target guild, and calls `syncGuild(...)` with `serverTemplate`, then exits.
- `bot.js` is the long-running service. On startup it also calls `syncGuild(...)`, then ensures the verification panel exists, optionally backfills join gating, and handles button/modal interactions for verification review.

The core design is template-driven:

- `server-template.js` is the source of truth for roles, category/channel layout, permission overwrites, seeded embeds, and verification flow metadata.
- `discord-provisioning.js` turns that declarative template into Discord state. It creates or updates roles, categories, text channels, and seeded messages idempotently.
- Seeded messages and the verification panel are matched by footer markers in the form `TitanTreasure Setup • <key>`, so updates should preserve that marker-based workflow rather than introducing ad hoc message discovery.

The verification flow is staff-reviewed rather than fully automatic:

- Users click the `verify:start` button, submit a modal, and the bot posts the submission into the review channel from `verificationTemplate`.
- Staff decisions use `verify:approve:<memberId>`, `verify:approve-vip:<memberId>`, and `verify:reject:<memberId>` custom IDs.
- Approval removes `Unverified`, adds `Verified`, and can optionally add `VIP`.

Brand and growth guidance is now centralized as well:

- `brand-kit.js` is the source of truth for TitanTreasure brand colors, asset paths, tone, and category-level purpose.
- `.github/prompts/titantreasure-marketing-agent.prompt.md` defines the repository's marketing/community-growth agent for future Copilot sessions.

## Current rollout context

- The user plans to launch on a **new Discord server** rather than retrofitting an old one. Prefer a clean bootstrap against the new guild instead of migration logic unless the user changes direction.
- The community/affiliate signup link is `https://titantreasure.vip/discord`. Treat this as the default **Discord/community CTA** and keep it separate from the user's personal affiliate link so attribution stays clean.
- On the next setup pass, update `.env` with the new `DISCORD_GUILD_ID`, then run `npm run bootstrap` to provision the guild from `server-template.js`, then run `npm start` for the live bot.
- If future sessions add CTAs, referral messaging, VIP transfer copy, or onboarding prompts, prefer the community signup link above for Discord-driven funnels unless the user says otherwise.

## Key conventions

- Keep configuration declarative in `server-template.js`. New channels, roles, seeded content, panel copy, or verification routing should usually be expressed in the template instead of hardcoding special cases in `bot.js` or `discord-provisioning.js`.
- Permission overwrites refer to template role keys (`admin`, `verified`, `vip`, etc.), but runtime lookups often resolve by display name (`Admin`, `Verified`, `VIP`). When changing role names, update both the role definitions and any name-based lookups such as `staffRoleNames` and `roleNames`.
- Provisioning is intentionally idempotent. `syncGuild(...)` edits existing roles/channels/messages when names and marker footers match, so preserve those identifiers when evolving the server layout.
- Use `brand-kit.js` instead of introducing fresh one-off embed colors or ad hoc asset references. The current palette was derived from the logo and banner assets already checked into the repository.
- `ENABLE_GUILD_MEMBERS_INTENT=true` gates extra behavior. When enabled, `bot.js` adds the `GuildMembers` intent, backfills `Unverified` onto existing members, and applies join gating on `guildMemberAdd`. Without it, the bot still provisions the server and handles verification submissions, but join gating is limited.
- Environment validation follows the `REQUIRED_ENV_VARS` + `getRequiredEnv(...)` pattern in both entrypoints. The code currently requires `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`; `ENABLE_GUILD_MEMBERS_INTENT` is optional. `.env.example` also lists `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_TEMPLATE_LINK`, but the current JavaScript entrypoints do not consume them.
- This codebase uses CommonJS (`require`, `module.exports`) throughout. Keep new modules in the same style unless the whole project is being migrated.
