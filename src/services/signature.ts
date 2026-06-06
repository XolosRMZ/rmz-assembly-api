import { createHash } from "node:crypto";
import { encodeCashAddress } from "ecashaddrjs";

type VerifyVoteSignatureInput = {
  message: string;
  signature: string;
  publicKey: string;
  wallet: string;
};

export function verifyVoteSignature({ publicKey, wallet }: VerifyVoteSignatureInput): boolean {
  if (!publicKeyDerivesToWallet(publicKey, wallet)) {
    return false;
  }

  // TODO: Replace this with an eCash-compatible signed message verifier.
  // Current dependencies include ecashaddrjs only; ecash-lib or a secp256k1
  // verifier is required to validate the message signature itself.
  throw new Error("Signature verification not available");
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
