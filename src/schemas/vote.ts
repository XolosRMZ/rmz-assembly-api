import { z } from "zod";

export const aliasRegex = /^[a-z0-9]{1,21}\.xec$/;

export const EligibilityCheckRequestSchema = z.object({
  alias: z.string().trim().min(1),
  wallet: z.string().trim().min(1)
});

export const PrepareVoteRequestSchema = z.object({
  proposalId: z.string().trim().min(1),
  alias: z.string().trim().min(1),
  wallet: z.string().trim().min(1),
  choiceId: z.string().trim().min(1)
});

export const SubmitVoteRequestSchema = z.object({
  proposalId: z.string().trim().min(1),
  voteId: z.string().trim().min(1),
  challengeId: z.string().trim().min(1),
  alias: z.string().trim().min(1),
  wallet: z.string().trim().min(1),
  choiceId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
  message: z.string().min(1)
});

export const VoteRecordSchema = z.object({
  proposalId: z.string().min(1),
  voteId: z.string().min(1),
  challengeId: z.string().optional(),
  alias: z.string().min(1),
  normalizedAlias: z.string().min(1),
  wallet: z.string().min(1),
  choiceId: z.string().min(1),
  valid: z.boolean(),
  reason: z.string().optional(),
  submittedAt: z.string().datetime(),
  signature: z.string().optional(),
  messageHash: z.string().optional()
});

export type EligibilityCheckRequest = z.infer<typeof EligibilityCheckRequestSchema>;
export type PrepareVoteRequest = z.infer<typeof PrepareVoteRequestSchema>;
export type SubmitVoteRequest = z.infer<typeof SubmitVoteRequestSchema>;
export type VoteRecord = z.infer<typeof VoteRecordSchema>;
