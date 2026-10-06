import { loadEnvFile } from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";
import hre from "hardhat";

loadEnvFile(new URL(".env", import.meta.url));

const config = {
  source: "contracts/Counter.sol",
  name: "Counter",
  args: [],
  network: {
    rpcUrl: "http://127.0.0.1:8545",
    chainId: 31337,
  },
};

const provider = new JsonRpcProvider(
  config.network.rpcUrl,
  config.network.chainId,
);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const { abi, bytecode } = await hre.artifacts.readArtifact(
  `${config.source}:${config.name}`,
);
const contract = await new ContractFactory(abi, bytecode, wallet).deploy(
  ...config.args,
  { from: process.env.PUBLIC_ADDRESS },
);

await contract.deploymentTransaction().wait();

const file = new URL("../frontend/public/contracts.json", import.meta.url);
const contracts = JSON.parse(await readFile(file, "utf8"));
contracts[config.name] = {
  address: await contract.getAddress(),
  abi,
  ...config.network,
};

await writeFile(file, JSON.stringify(contracts, null, 2));
console.log(`${config.name}: ${await contract.getAddress()}`);
provider.destroy();
