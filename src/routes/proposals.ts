import { Router } from "express";
import { readAuditLogText } from "../services/auditLog.js";
import { calculateResults, readAllProposals, readProposal, readVoteRecords } from "../services/results.js";

export const proposalsRouter = Router();

proposalsRouter.get("/", async (_req, res, next) => {
  try {
    const proposals = await readAllProposals();
    res.json(proposals);
  } catch (error) {
    next(error);
  }
});

proposalsRouter.get("/:proposalId", async (req, res, next) => {
  try {
    const proposal = await readProposal(req.params.proposalId);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json(proposal.proposal);
  } catch (error) {
    next(error);
  }
});

proposalsRouter.get("/:proposalId/results", async (req, res, next) => {
  try {
    const proposal = await readProposal(req.params.proposalId);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json(await calculateResults(proposal.proposal));
  } catch (error) {
    next(error);
  }
});

proposalsRouter.get("/:proposalId/votes", async (req, res, next) => {
  try {
    const proposal = await readProposal(req.params.proposalId);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json(await readVoteRecords(req.params.proposalId));
  } catch (error) {
    next(error);
  }
});

proposalsRouter.get("/:proposalId/audit.jsonl", async (req, res, next) => {
  try {
    const proposal = await readProposal(req.params.proposalId);

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    const auditLog = await readAuditLogText(req.params.proposalId);

    if (auditLog === null) {
      res.type("text/plain").send("");
      return;
    }

    res.type("text/plain").send(auditLog);
  } catch (error) {
    next(error);
  }
});
