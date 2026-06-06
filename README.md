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

## Public Audit Caveat

Votes and audit records are designed to be public in this MVP. Do not submit private data that should not be exposed in public JSON or JSONL records.

## B3.1 Limitations

- Eligibility checks are stubs and always return `eligible: false`.
- Signature verification is not implemented; vote submission returns HTTP 501.
- SQLite is not implemented.
- Proposals are loaded from JSON files in `data/proposals`.
- Votes and audit logs use JSONL files for the MVP data shape.
- Vote challenges are stored in memory and are lost on process restart.
