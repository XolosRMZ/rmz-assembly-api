# RMZ Assembly API

TypeScript Express backend skeleton for the eCash Mexico / xolosArmy RMZ Assembly.

The service is intended to support signed off-chain voting where eligibility is derived from on-chain RMZ ownership and a confirmed `.xec` alias matching the voter wallet. Results and audit records are public.

## Voting Rule

The MVP rule is:

- 1 confirmed `.xec` alias = 1 effective vote.
- Revoting is allowed until the proposal closes.
- Aggregation counts only the latest valid vote per normalized alias submitted at or before `endsAt`.

## Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when overriding defaults.

Eligibility defaults:

- `CHRONIK_URL=https://chronik.xolosarmy.xyz`
- `ALIAS_INDEXER_URL=https://alias.ecash.mx`
- `RMZ_TOKEN_ID=c923bd0f09c630c5e9980cf518c8d34b6353802a3cb7c3f34fa7cc85c9305908`

## Scripts

- `npm run dev` - run the API with `tsx`
- `npm run build` - compile TypeScript to `dist`
- `npm run start` - run compiled JavaScript
- `npm run typecheck` - run TypeScript without emitting files

## Endpoints

- `GET /v1/assembly/health`
- `GET /v1/assembly/proposals`
- `GET /v1/assembly/proposals/:proposalId`
- `GET /v1/assembly/proposals/:proposalId/results`
- `GET /v1/assembly/proposals/:proposalId/votes`
- `GET /v1/assembly/proposals/:proposalId/audit.jsonl`
- `POST /v1/assembly/eligibility/check`
- `POST /v1/assembly/votes/prepare`
- `POST /v1/assembly/votes`

### Eligibility Check

`POST /v1/assembly/eligibility/check` verifies the server-side rule: one confirmed `.xec` alias matching the submitted eCash wallet, plus at least one atom of the configured RMZ token, is eligible for one vote. The API normalizes alias and wallet input, rejects pending aliases, fails closed when the alias indexer or Chronik is unavailable, and returns evidence from both systems.

Request:

```bash
curl -X POST http://127.0.0.1:3016/v1/assembly/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"alias":"xolosarmy.xec","wallet":"ecash:qzdq0q65fwnt94rlcph5kllj0xcry6e0v58zrgp7a3"}' | jq
```

Eligible response:

```json
{
  "eligible": true,
  "alias": "xolosarmy.xec",
  "wallet": "ecash:qzdq0q65fwnt94rlcph5kllj0xcry6e0v58zrgp7a3",
  "rmz": {
    "holder": true,
    "tokenId": "c923bd0f09c630c5e9980cf518c8d34b6353802a3cb7c3f34fa7cc85c9305908",
    "atoms": "1"
  },
  "aliasRecord": {
    "status": "confirmed",
    "txid": "...",
    "blockheight": 952171,
    "address": "ecash:qzdq0q65fwnt94rlcph5kllj0xcry6e0v58zrgp7a3"
  },
  "checkedAt": "2026-06-06T00:00:00.000Z"
}
```

Ineligible responses include `eligible: false`, the normalized `alias` and `wallet`, a `reason`, `checkedAt`, and any available `aliasRecord` or `rmz` evidence. Common reasons include `Alias not found`, `Alias is not confirmed`, `Alias does not match wallet`, `Wallet does not hold RMZ`, `Alias indexer unavailable`, and `Chronik unavailable`. Invalid aliases or wallet addresses return HTTP 400.

## Public Audit Caveat

Votes and audit records are designed to be public in this MVP. Do not submit private data that should not be exposed in public JSON or JSONL records.

## Current Limitations

- Signature verification is not implemented; vote submission returns HTTP 501.
- SQLite is not implemented.
- Proposals are loaded from JSON files in `data/proposals`.
- Votes and audit logs use JSONL files for the MVP data shape.
- Vote challenges are stored in memory and are lost on process restart.
