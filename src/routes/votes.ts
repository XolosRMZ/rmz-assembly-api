import { randomUUID } from "node:crypto";
import { Router } from "express";
import { PrepareVoteRequestSchema, SubmitVoteRequestSchema, VoteRecord } from "../schemas/vote.js";
import { appendAuditRecord } from "../services/auditLog.js";
import { checkEligibility, EligibilityInputError } from "../services/eligibility.js";
import { appendVoteRecord, readProposal } from "../services/results.js";
import { verifyVoteSignature } from "../services/signature.js";

type Challenge = {
  challengeId: string;
  voteId: string;
  proposalId: string;
  alias: string;
  wallet: string;
  choiceId: string;
  message: string;
  issuedAt: string;
  expiresAt: string;
  consumed: boolean;
  nonce: string;
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
    const normalizedWallet = parsed.data.wallet.toLowerCase();
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
      `wallet: ${normalizedWallet}`,
      `choiceId: ${parsed.data.choiceId}`,
      `voteId: ${voteId}`,
      `challengeId: ${challengeId}`,
      `nonce: ${nonce}`,
      `issuedAt: ${issuedAtIso}`,
      `expiresAt: ${expiresAtIso}`,
      "purpose: rmz-assembly-vote"
    ].join("\n");

    challenges.set(challengeId, {
      challengeId,
      voteId,
      proposalId: proposalWithHash.proposal.id,
      alias: normalizedAlias,
      wallet: normalizedWallet,
      choiceId: parsed.data.choiceId,
      message,
      issuedAt: issuedAtIso,
      expiresAt: expiresAtIso,
      consumed: false,
      nonce
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

votesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = SubmitVoteRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid submit vote request", details: parsed.error.flatten() });
      return;
    }

    const normalizedAlias = parsed.data.alias.toLowerCase();
    const normalizedWallet = parsed.data.wallet.toLowerCase();
    const challenge = challenges.get(parsed.data.challengeId);

    if (!challenge || !isUsableChallenge(challenge)) {
      res.status(400).json({ accepted: false, error: "Invalid or expired challenge" });
      return;
    }

    if (
      parsed.data.proposalId !== challenge.proposalId ||
      parsed.data.voteId !== challenge.voteId ||
      parsed.data.challengeId !== challenge.challengeId ||
      normalizedAlias !== challenge.alias ||
      normalizedWallet !== challenge.wallet ||
      parsed.data.message !== challenge.message
    ) {
      res.status(400).json({ accepted: false, error: "Invalid or expired challenge" });
      return;
    }

    const proposalWithHash = await readProposal(parsed.data.proposalId);

    if (!proposalWithHash) {
      res.status(404).json({ accepted: false, error: "Proposal not found" });
      return;
    }

    const proposal = proposalWithHash.proposal;
    const now = Date.now();

    if (proposal.status !== "open" || now < Date.parse(proposal.startsAt) || now > Date.parse(proposal.endsAt)) {
      res.status(400).json({ accepted: false, error: "Proposal is not open" });
      return;
    }

    const choiceExists = proposal.choices.some((choice) => choice.id === challenge.choiceId);

    if (!choiceExists) {
      res.status(400).json({ accepted: false, error: "Invalid or expired challenge" });
      return;
    }

    const eligibility = await checkEligibility({ alias: normalizedAlias, wallet: normalizedWallet });

    if (!eligibility.eligible) {
      res.status(403).json({ accepted: false, error: "Not eligible", eligibility });
      return;
    }

    let signatureValid = false;

    try {
      signatureValid = verifyVoteSignature({
        message: parsed.data.message,
        signature: parsed.data.signature,
        publicKey: parsed.data.publicKey,
        wallet: normalizedWallet
      });
    } catch (error) {
      if (error instanceof Error && error.message !== "Signature verification not available") {
        throw error;
      }
    }

    if (!signatureValid) {
      res.status(400).json({ accepted: false, error: "Invalid signature" });
      return;
    }

    const record: VoteRecord = {
      voteId: challenge.voteId,
      proposalId: challenge.proposalId,
      challengeId: challenge.challengeId,
      alias: normalizedAlias,
      normalizedAlias,
      wallet: normalizedWallet,
      choiceId: challenge.choiceId,
      message: challenge.message,
      signature: parsed.data.signature,
      publicKey: parsed.data.publicKey,
      submittedAt: new Date().toISOString(),
      valid: true,
      effective: true,
      supersededBy: null,
      eligibilityEvidence: {
        rmzAtoms: eligibility.rmz.atoms,
        aliasTxid: eligibility.aliasRecord.txid,
        aliasBlockheight: eligibility.aliasRecord.blockheight,
        checkedAt: eligibility.checkedAt
      }
    };

    await appendVoteRecord(record);
    await appendAuditRecord(record);
    challenge.consumed = true;

    res.json({ accepted: true, vote: record });
  } catch (error) {
    if (error instanceof EligibilityInputError) {
      res.status(400).json({ accepted: false, error: error.message });
      return;
    }

    next(error);
  }
});

function isUsableChallenge(challenge: Challenge): boolean {
  return !challenge.consumed && Date.now() <= Date.parse(challenge.expiresAt);
}
