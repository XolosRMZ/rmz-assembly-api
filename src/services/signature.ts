import { createHash } from "node:crypto";
import { encodeCashAddress } from "ecashaddrjs";
import { verifyMsg } from "ecash-lib";

type VerifyVoteSignatureInput = {
  message: string;
  signature: string;
  publicKey: string;
  wallet: string;
};

export function verifyVoteSignature({ message, signature, publicKey, wallet }: VerifyVoteSignatureInput): boolean {
  if (!publicKeyDerivesToWallet(publicKey, wallet)) {
    return false;
  }

  if (!isBase64RecoverableSignature(signature)) {
    return false;
  }

  return verifyMsg(message, signature, wallet.trim().toLowerCase());
}

function publicKeyDerivesToWallet(publicKey: string, wallet: string): boolean {
  if (!/^[0-9a-f]+$/i.test(publicKey)) {
    return false;
  }

  const publicKeyBytes = Buffer.from(publicKey, "hex");

  if (![33, 65].includes(publicKeyBytes.length)) {
    return false;
  }

  const hash160 = createHash("ripemd160").update(createHash("sha256").update(publicKeyBytes).digest()).digest("hex");
  const derivedWallet = encodeCashAddress("ecash", "p2pkh", hash160);

  return derivedWallet.toLowerCase() === wallet.trim().toLowerCase();
}

function isBase64RecoverableSignature(signature: string): boolean {
  try {
    return Buffer.from(signature, "base64").length === 65;
  } catch {
    return false;
  }
}
