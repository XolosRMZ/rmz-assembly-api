import { Router } from "express";
import { EligibilityCheckRequestSchema } from "../schemas/vote.js";
import { checkEligibility, EligibilityInputError } from "../services/eligibility.js";

export const eligibilityRouter = Router();

eligibilityRouter.post("/check", async (req, res, next) => {
  try {
    const parsed = EligibilityCheckRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid eligibility check request", details: parsed.error.flatten() });
      return;
    }

    res.json(await checkEligibility(parsed.data));
  } catch (error) {
    if (error instanceof EligibilityInputError) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});
