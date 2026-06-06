import { z } from "zod";

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1)
});

export const ProposalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  status: z.enum(["draft", "open", "closed"]).default("open"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  choices: z.array(ChoiceSchema).min(1),
  eligibility: z.object({
    rmzRequired: z.boolean(),
    rmzTokenId: z.string().min(1),
    minRmzAtoms: z.string().min(1),
    aliasRequired: z.boolean(),
    aliasStatus: z.literal("confirmed")
  }),
  rules: z.object({
    voteUnit: z.literal("alias"),
    votesPerAlias: z.literal(1),
    revotePolicy: z.literal("latest-valid-before-close"),
    onChainTransactions: z.boolean()
  })
});

export type Choice = z.infer<typeof ChoiceSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
