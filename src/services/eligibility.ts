import { ChronikClient } from "chronik-client";
import { decodeCashAddress } from "ecashaddrjs";
import { z } from "zod";
import { aliasRegex } from "../schemas/vote.js";

const DEFAULT_ALIAS_INDEXER_URL = "https://alias.ecash.mx";
const DEFAULT_CHRONIK_URL = "https://chronik.xolosarmy.xyz";
const DEFAULT_RMZ_TOKEN_ID = "c923bd0f09c630c5e9980cf518c8d34b6353802a3cb7c3f34fa7cc85c9305908";

const AliasRecordSchema = z.object({
  status: z.string(),
  txid: z.string().optional(),
  blockheight: z.number().int().optional(),
  address: z.string()
});

export type EligibilityInput = {
  alias: string;
  wallet: string;
};

export type EligibilityAliasRecord = {
  status: string;
  txid?: string;
  blockheight?: number;
  address: string;
};

export type RmzEvidence = {
  holder: boolean;
  tokenId: string;
  atoms: string;
};

export type EligibilityResult =
  | {
      eligible: true;
      alias: string;
      wallet: string;
      rmz: RmzEvidence & { holder: true };
      aliasRecord: EligibilityAliasRecord;
      checkedAt: string;
    }
  | {
      eligible: false;
      alias: string;
      wallet: string;
      reason: string;
      rmz?: RmzEvidence;
      aliasRecord?: EligibilityAliasRecord;
      checkedAt: string;
    };

export class EligibilityInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EligibilityInputError";
  }
}

export async function checkEligibility(input: EligibilityInput): Promise<EligibilityResult> {
  const alias = normalizeAlias(input.alias);
  const wallet = normalizeWallet(input.wallet);
  const checkedAt = new Date().toISOString();
  const tokenId = getRmzTokenId();

  let aliasRecord: EligibilityAliasRecord | null;

  try {
    aliasRecord = await fetchAliasRecord(alias);
  } catch {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Alias indexer unavailable",
      checkedAt
    };
  }

  if (!aliasRecord) {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Alias not found",
      checkedAt
    };
  }

  if (aliasRecord.status !== "confirmed") {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Alias is not confirmed",
      aliasRecord,
      checkedAt
    };
  }

  if (aliasRecord.address.toLowerCase() !== wallet) {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Alias does not match wallet",
      aliasRecord,
      checkedAt
    };
  }

  let rmz: RmzEvidence;

  try {
    rmz = await getRmzEvidence(wallet, tokenId);
  } catch {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Chronik unavailable",
      aliasRecord,
      checkedAt
    };
  }

  if (!rmz.holder) {
    return {
      eligible: false,
      alias,
      wallet,
      reason: "Wallet does not hold RMZ",
      aliasRecord,
      rmz,
      checkedAt
    };
  }

  return {
    eligible: true,
    alias,
    wallet,
    aliasRecord,
    rmz: {
      ...rmz,
      holder: true
    },
    checkedAt
  };
}

function normalizeAlias(alias: string): string {
  const normalized = alias.trim().toLowerCase();

  if (!aliasRegex.test(normalized)) {
    throw new EligibilityInputError("Invalid alias format");
  }

  return normalized;
}

function normalizeWallet(wallet: string): string {
  const normalized = wallet.trim().toLowerCase();

  try {
    const decoded = decodeCashAddress(normalized);

    if (decoded.prefix !== "ecash") {
      throw new Error("Invalid prefix");
    }
  } catch {
    throw new EligibilityInputError("Invalid eCash wallet address");
  }

  return normalized;
}

async function fetchAliasRecord(alias: string): Promise<EligibilityAliasRecord | null> {
  const aliasIndexerUrl = trimTrailingSlash(process.env.ALIAS_INDEXER_URL ?? DEFAULT_ALIAS_INDEXER_URL);
  const namePart = alias.slice(0, -".xec".length);
  const response = await fetch(`${aliasIndexerUrl}/alias/${encodeURIComponent(namePart)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Alias indexer returned ${response.status}`);
  }

  const parsed = AliasRecordSchema.parse(await response.json());

  return {
    status: parsed.status,
    txid: parsed.txid,
    blockheight: parsed.blockheight,
    address: parsed.address.toLowerCase()
  };
}

async function getRmzEvidence(wallet: string, tokenId: string): Promise<RmzEvidence> {
  const chronik = new ChronikClient([trimTrailingSlash(process.env.CHRONIK_URL ?? DEFAULT_CHRONIK_URL)]);
  const { utxos } = await chronik.address(wallet).utxos();
  const atoms = utxos.reduce((sum, utxo) => {
    if (utxo.token?.tokenId !== tokenId) {
      return sum;
    }

    return sum + utxo.token.atoms;
  }, 0n);

  return {
    holder: atoms >= 1n,
    tokenId,
    atoms: atoms.toString()
  };
}

function getRmzTokenId(): string {
  return process.env.RMZ_TOKEN_ID ?? DEFAULT_RMZ_TOKEN_ID;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
