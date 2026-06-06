import cors from "cors";
import dotenv from "dotenv";
import express, { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { eligibilityRouter } from "./routes/eligibility.js";
import { proposalsRouter } from "./routes/proposals.js";
import { votesRouter } from "./routes/votes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3016);
const allowedOrigins = new Set([
  process.env.ALLOWED_ORIGIN ?? "https://ecash.mx",
  "https://ecash.mx",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "64kb" }));

app.get("/v1/assembly/health", (_req, res) => {
  res.json({
    ok: true,
    service: "rmz-assembly-api"
  });
});

app.use("/v1/assembly/proposals", proposalsRouter);
app.use("/v1/assembly/eligibility", eligibilityRouter);
app.use("/v1/assembly/votes", votesRouter);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(500).json({ error: "Data validation failed", details: error.flatten() });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`rmz-assembly-api listening on port ${port}`);
});
