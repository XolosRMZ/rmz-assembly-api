import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { encodeCashAddress } from "ecashaddrjs";
import { Ecc, signMsg, toHex } from "ecash-lib";
import { verifyVoteSignature } from "../src/services/signature.js";

const privateKey = Buffer.from("0000000000000000000000000000000000000000000000000000000000000001", "hex");
const publicKey = new Ecc().derivePubkey(privateKey);
const publicKeyHex = toHex(publicKey);
const publicKeyHash = createHash("ripemd160").update(createHash("sha256").update(publicKey).digest()).digest("hex");
const wallet = encodeCashAddress("ecash", "p2pkh", publicKeyHash);
const wrongWallet = "ecash:qzk2a72y5zzc2q5c4q3l4htsg8hl2htz4se0qkp7gd";
const message = [
  "RMZ Assembly Vote",
  "",
  "domain: ecash.mx",
  "app: rmz-assembly",
  "network: ecash-mainnet",
  "proposalId: rmz-b3-001",
  "proposalHash: sha256:test",
  "alias: test",
  `wallet: ${wallet}`,
  "choiceId: yes",
  "voteId: fixture-vote",
  "challengeId: fixture-challenge",
  "nonce: fixture-nonce",
  "issuedAt: 2026-06-05T00:00:00.000Z",
  "expiresAt: 2026-06-05T00:10:00.000Z",
  "purpose: rmz-assembly-vote"
].join("\n");
const signature = signMsg(message, privateKey);

assert.equal(verifyVoteSignature({ message, signature, publicKey: publicKeyHex, wallet }), true);
assert.equal(verifyVoteSignature({ message: `${message}\n`, signature, publicKey: publicKeyHex, wallet }), false);
assert.equal(verifyVoteSignature({ message, signature, publicKey: publicKeyHex, wallet: wrongWallet }), false);

console.log("signature fixture passed");
