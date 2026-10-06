import { getAddress } from "ethers";

export function createWalletSession(target = globalThis.window) {
  const wallets = new Map();
  let active;
  let notify = () => {};
  let state = {
    wallets: [],
    walletId: "",
    address: null,
    chainId: null,
    error: null,
  };

  function update(changes) {
    state = { ...state, ...changes };
    notify(state);
  }

  function report(error) {
    update({ error: error.message || String(error) });
  }

  async function refresh(binding) {
    const version = ++binding.version;
    const [accounts, chainId] = await Promise.all([
      binding.wallet.provider.request({ method: "eth_accounts" }),
      binding.wallet.provider.request({ method: "eth_chainId" }),
    ]);

    if (
      active === binding &&
      binding.version === version &&
      !binding.disconnected
    ) {
      update({
        address: accounts.length ? getAddress(accounts[0]) : null,
        chainId,
        error: null,
      });
    }
  }

  function refreshInBackground(binding) {
    const version = binding.version + 1;

    refresh(binding).catch((error) => {
      if (
        active === binding &&
        binding.version === version &&
        !binding.disconnected
      ) {
        report(error);
      }
    });
  }

  function detachWallet() {
    if (!active) {
      return;
    }

    const { wallet, handlers } = active;

    for (const [event, handler] of Object.entries(handlers)) {
      wallet.provider.removeListener(event, handler);
    }

    active = undefined;
  }

  function selectWallet(walletId) {
    const wallet = wallets.get(walletId);

    if (!wallet) {
      throw new Error("Wallet not found. Choose an available wallet.");
    }

    detachWallet();

    const binding = { wallet, version: 0, disconnected: false, handlers: {} };
    active = binding;

    binding.handlers = {
      accountsChanged(accounts) {
        update({
          address: accounts.length ? getAddress(accounts[0]) : null,
          error: null,
        });
        refreshInBackground(binding);
      },
      chainChanged(chainId) {
        update({ chainId, error: null });
        refreshInBackground(binding);
      },
      connect() {
        binding.disconnected = false;
        refreshInBackground(binding);
      },
      disconnect() {
        binding.disconnected = true;
        binding.version++;
        update({ address: null, chainId: null, error: null });
      },
    };

    for (const [event, handler] of Object.entries(binding.handlers)) {
      wallet.provider.on(event, handler);
    }

    update({ walletId, address: null, chainId: null, error: null });
    refreshInBackground(binding);
  }

  function announce({ detail }) {
    const { info, provider } = detail || {};

    if (
      !info?.uuid ||
      !info.name ||
      typeof provider?.request !== "function" ||
      typeof provider.on !== "function" ||
      typeof provider.removeListener !== "function" ||
      wallets.has(info.uuid)
    ) {
      return;
    }

    const legacyWallet = wallets.get("injected");
    const replacesLegacy = info.uuid !== "injected" && legacyWallet?.provider === provider;
    const replacesSelection = replacesLegacy && state.walletId === "injected";

    if (replacesLegacy) {
      wallets.delete("injected");
    }

    wallets.set(info.uuid, { id: info.uuid, name: info.name, provider });
    update({
      wallets: [...wallets.values()].map(({ id, name }) => ({ id, name })),
    });

    if (!active || replacesSelection) {
      selectWallet(info.uuid);
    }
  }

  function start(onChange) {
    notify = onChange;
    notify(state);
    target?.addEventListener("eip6963:announceProvider", announce);
    target?.dispatchEvent(new (target.Event || Event)("eip6963:requestProvider"));

    if (!active && state.walletId) {
      selectWallet(state.walletId);
    }

    const fallbackTimer = setTimeout(() => {
      if (!wallets.size && target?.ethereum) {
        announce({
          detail: {
            info: { uuid: "injected", name: "Browser wallet" },
            provider: target.ethereum,
          },
        });
      }
    }, 300);

    return () => {
      clearTimeout(fallbackTimer);
      target?.removeEventListener("eip6963:announceProvider", announce);
      detachWallet();
      notify = () => {};
    };
  }

  async function connectWallet() {
    if (!active) {
      throw new Error("No wallet found. Install or unlock a browser wallet.");
    }

    const binding = active;
    binding.disconnected = false;

    await binding.wallet.provider.request({ method: "eth_requestAccounts" });

    if (active !== binding) {
      throw new Error("Wallet changed during connection. Connect the selected wallet.");
    }

    if (binding.disconnected) {
      throw new Error("Wallet disconnected during connection. Try again.");
    }

    await refresh(binding);

    return active === binding ? state.address : null;
  }

  function getWallet() {
    if (!active || active.disconnected || !state.address) {
      throw new Error("Connect the selected wallet first.");
    }

    return { provider: active.wallet.provider, address: state.address };
  }

  return { start, selectWallet, connectWallet, getWallet, getState: () => state };
}

export const walletSession = createWalletSession();
