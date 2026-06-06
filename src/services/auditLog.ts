import { access, readFile } from "node:fs/promises";
import path from "node:path";

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
