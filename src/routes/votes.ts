import { randomUUID } from "node:crypto";
import { Router } from "express";
import { PrepareVoteRequestSchema, SubmitVoteRequestSchema } from "../schemas/vote.js";
import { readProposal } from "../services/results.js";

type Challenge = {
  proposalId: string;
  alias: string;
  wallet: string;
  choiceId: string;
  voteId: string;
  challengeId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
};

export const votesRouter = Router();
export const challenges = new Map<string, Challenge>();

votesRouter.post("/prepare", async (req, res, next) => {
  try {
    const parsed = PrepareVoteRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prepare vote request", details: parsed.error.flatten() });
      return;
    }

    const proposalWithHash = await readProposal(parsed.data.proposalId);

    if (!proposalWithHash) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const normalizedAlias = parsed.data.alias.toLowerCase();
    const choiceExists = proposalWithHash.proposal.choices.some((choice) => choice.id === parsed.data.choiceId);

    if (!choiceExists) {
      res.status(400).json({ error: "Invalid choiceId" });
      return;
    }

    const voteId = randomUUID();
    const challengeId = randomUUID();
    const nonce = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);
    const issuedAtIso = issuedAt.toISOString();
    const expiresAtIso = expiresAt.toISOString();
    const message = [
      "RMZ Assembly Vote",
      "",
      "domain: ecash.mx",
      "app: rmz-assembly",
      "network: ecash-mainnet",
      `proposalId: ${proposalWithHash.proposal.id}`,
      `proposalHash: sha256:${proposalWithHash.hash}`,
      `alias: ${normalizedAlias}`,
      `wallet: ${parsed.data.wallet}`,
      `choiceId: ${parsed.data.choiceId}`,
      `voteId: ${voteId}`,
      `challengeId: ${challengeId}`,
      `nonce: ${nonce}`,
      `issuedAt: ${issuedAtIso}`,
      `expiresAt: ${expiresAtIso}`,
      "purpose: rmz-assembly-vote"
    ].join("\n");

    challenges.set(challengeId, {
      proposalId: proposalWithHash.proposal.id,
      alias: normalizedAlias,
      wallet: parsed.data.wallet,
      choiceId: parsed.data.choiceId,
      voteId,
      challengeId,
      nonce,
      issuedAt: issuedAtIso,
      expiresAt: expiresAtIso,
      message
    });

    res.json({
      voteId,
      challengeId,
      message,
      expiresAt: expiresAtIso
    });
  } catch (error) {
    next(error);
  }
});

votesRouter.post("/", (req, res) => {
  const parsed = SubmitVoteRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid submit vote request", details: parsed.error.flatten() });
    return;
  }

  res.status(501).json({
    accepted: false,
    error: "Signature verification not implemented yet"
  });
});
