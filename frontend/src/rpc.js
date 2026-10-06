import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  parseEther,
  toQuantity,
} from "ethers";
import { walletSession } from "./wallet.js";

export async function loadContracts() {
  const response = await fetch(`${import.meta.env.BASE_URL}contracts.json`, {
    cache: "no-store",
  });
  const data = await response.json();

  return Object.entries(data).map(([name, contract]) => ({
    ...contract,
    name,
    methods: new Interface(contract.abi).fragments.filter(
      (item) => item.type === "function",
    ),
  }));
}

export async function connectWallet() {
  return walletSession.connectWallet();
}

export async function invoke(data, method, fields) {
  const read = ["view", "pure"].includes(method.stateMutability);
  let provider;

  try {
    let runner;
    let wallet;

    if (read) {
      provider = new JsonRpcProvider(data.rpcUrl, data.chainId);
      runner = provider;
    } else {
      if (!walletSession.getState().address) {
        await connectWallet();
      }

      wallet = walletSession.getWallet();
      const chainId = await wallet.provider.request({ method: "eth_chainId" });

      if (BigInt(chainId) !== BigInt(data.chainId)) {
        await wallet.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toQuantity(data.chainId) }],
        });
      }

      const current = walletSession.getWallet();

      if (current.provider !== wallet.provider || current.address !== wallet.address) {
        throw new Error("Wallet or account changed. Try the transaction again.");
      }

      const currentChainId = await wallet.provider.request({ method: "eth_chainId" });

      if (BigInt(currentChainId) !== BigInt(data.chainId)) {
        throw new Error("Switch the wallet to the contract network and try again.");
      }

      provider = new BrowserProvider(wallet.provider);
      runner = await provider.getSigner(wallet.address);
    }

    const contract = new Contract(data.address, data.abi, runner);
    const args = method.inputs.map((param, index) => {
      const value = fields.get(String(index));

      return ["array", "tuple", "bool"].includes(param.baseType)
        ? JSON.parse(value)
        : value;
    });

    if (method.stateMutability === "payable") {
      args.push({ value: parseEther(fields.get("value") || "0") });
    }

    if (wallet) {
      const current = walletSession.getWallet();

      if (current.provider !== wallet.provider || current.address !== wallet.address) {
        throw new Error("Wallet or account changed. Try the transaction again.");
      }
    }

    const result = await contract.getFunction(method.format("sighash"))(...args);

    return read ? result : (await result.wait()).hash;
  } finally {
    provider?.destroy();
  }
}
