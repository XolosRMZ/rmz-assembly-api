import { access, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Proposal, ProposalSchema } from "../schemas/proposal.js";
import { VoteRecord, VoteRecordSchema } from "../schemas/vote.js";

const dataRoot = path.resolve(process.cwd(), "data");
const proposalsDir = path.join(dataRoot, "proposals");
const votesDir = path.join(dataRoot, "votes");

export type ProposalWithHash = {
  proposal: Proposal;
  rawJson: string;
  hash: string;
};

export type ProposalResults = {
  proposalId: string;
  totals: Record<string, number>;
  effectiveVotes: number;
  supersededVotes: number;
  invalidVotes: number;
};

export function proposalFilePath(proposalId: string): string {
  return path.join(proposalsDir, `${proposalId}.json`);
}

export function voteFilePath(proposalId: string): string {
  return path.join(votesDir, `${proposalId}.jsonl`);
}

export async function readProposal(proposalId: string): Promise<ProposalWithHash | null> {
  const filePath = proposalFilePath(proposalId);

  try {
    await access(filePath);
  } catch {
    return null;
  }

  const rawJson = await readFile(filePath, "utf8");
  const proposal = ProposalSchema.parse(JSON.parse(rawJson));
  const hash = createHash("sha256").update(rawJson).digest("hex");

  return { proposal, rawJson, hash };
}

export async function readAllProposals(): Promise<Proposal[]> {
  let entries: string[];

  try {
    entries = await readdir(proposalsDir);
  } catch {
    return [];
  }

  const proposals = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .map(async (entry) => {
        const rawJson = await readFile(path.join(proposalsDir, entry), "utf8");
        return ProposalSchema.parse(JSON.parse(rawJson));
      })
  );

  return proposals;
}

export async function readVoteRecords(proposalId: string): Promise<VoteRecord[]> {
  const filePath = voteFilePath(proposalId);

  try {
    await access(filePath);
  } catch {
    return [];
  }

  const rawJsonl = await readFile(filePath, "utf8");
  return rawJsonl
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => VoteRecordSchema.parse(JSON.parse(line)));
}

export async function calculateResults(proposal: Proposal): Promise<ProposalResults> {
  const records = await readVoteRecords(proposal.id);
  const proposalEndsAt = Date.parse(proposal.endsAt);
  const latestByAlias = new Map<string, VoteRecord>();
  let invalidVotes = 0;
  let supersededVotes = 0;

  for (const record of records) {
    const submittedAt = Date.parse(record.submittedAt);

    if (!record.valid || Number.isNaN(submittedAt) || submittedAt > proposalEndsAt) {
      invalidVotes += 1;
      continue;
    }

    const normalizedAlias = record.normalizedAlias.toLowerCase();
    const existing = latestByAlias.get(normalizedAlias);

    if (!existing) {
      latestByAlias.set(normalizedAlias, record);
      continue;
    }

    if (Date.parse(record.submittedAt) >= Date.parse(existing.submittedAt)) {
      latestByAlias.set(normalizedAlias, record);
    }

    supersededVotes += 1;
  }

  const totals = Object.fromEntries(proposal.choices.map((choice) => [choice.id, 0]));

  for (const record of latestByAlias.values()) {
    totals[record.choiceId] = (totals[record.choiceId] ?? 0) + 1;
  }

  return {
    proposalId: proposal.id,
    totals,
    effectiveVotes: latestByAlias.size,
    supersededVotes,
    invalidVotes
  };
}
