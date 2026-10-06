import { Wallet } from "ethers";

const wallet = Wallet.createRandom();

console.log(
  `PUBLIC_ADDRESS=${wallet.address}\n` +
  `PUBLIC_KEY=${wallet.publicKey}\n` +
  `PRIVATE_KEY=${wallet.privateKey}`,
);
