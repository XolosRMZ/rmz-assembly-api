import { access, appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { VoteRecord } from "../schemas/vote.js";

const dataRoot = path.resolve(process.cwd(), "data");

export function auditFilePath(proposalId: string): string {
  return path.join(dataRoot, "audit", `${proposalId}.jsonl`);
}

export async function readAuditLogText(proposalId: string): Promise<string | null> {
  const filePath = auditFilePath(proposalId);

  try {
    await access(filePath);
  } catch {
    return null;
  }

  return readFile(filePath, "utf8");
}

export async function appendAuditRecord(record: VoteRecord): Promise<void> {
  const filePath = auditFilePath(record.proposalId);

  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
}
