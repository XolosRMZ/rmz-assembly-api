import { Router } from "express";
import { EligibilityCheckRequestSchema, aliasRegex } from "../schemas/vote.js";

export const eligibilityRouter = Router();

eligibilityRouter.post("/check", (req, res) => {
  const parsed = EligibilityCheckRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid eligibility check request", details: parsed.error.flatten() });
    return;
  }

  const alias = parsed.data.alias.toLowerCase();

  if (!aliasRegex.test(alias)) {
    res.status(400).json({ error: "Invalid alias format" });
    return;
  }

  res.json({
    eligible: false,
    alias,
    wallet: parsed.data.wallet,
    reason: "Eligibility service not implemented yet"
  });
});
