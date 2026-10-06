import React, { useEffect, useState } from "react";
import { connectWallet, invoke, loadContracts } from "./rpc.js";
import { walletSession } from "./wallet.js";

export default function App() {
  const [contracts, setContracts] = useState([]);
  const [result, setResult] = useState();
  const [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState(walletSession.getState);

  useEffect(() => walletSession.start(setWallet), []);

  useEffect(() => {
    let mounted = true;

    loadContracts()
      .then((data) => {
        if (mounted) {
          setContracts(data);
        }
      })
      .catch((error) => {
        if (mounted) {
          setResult(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function run(action) {
    setBusy(true);

    try {
      setResult(await action());
    } catch (error) {
      setResult(error.shortMessage || error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <fieldset disabled={busy}>
        <div className="wallet-controls">
          <label>
            Wallet
            <select
              value={wallet.walletId}
              disabled={!wallet.wallets.length}
              onChange={(event) => walletSession.selectWallet(event.target.value)}
            >
              {!wallet.wallets.length && <option value="">No wallets found</option>}
              {wallet.wallets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!wallet.walletId}
            onClick={() => run(connectWallet)}
          >
            {wallet.address ? "Reconnect wallet" : "Connect wallet"}
          </button>
        </div>

        <p role="status">
          {wallet.address ? `Account: ${wallet.address}` : "Wallet not connected"}
          {wallet.chainId && ` · Chain: ${BigInt(wallet.chainId).toString()}`}
        </p>
        {wallet.error && <p role="alert">{wallet.error}</p>}

        {contracts.map((contract) => (
          <section key={contract.name}>
            <h3>{contract.name} · {contract.address}</h3>

            {contract.methods.map((method) => (
              <form
                key={method.format("sighash")}
                onSubmit={(event) => {
                  event.preventDefault();

                  const fields = new FormData(event.currentTarget);
                  run(() => invoke(contract, method, fields));
                }}
              >
                <button>{method.name}</button>

                <div className="inputs">
                  {method.inputs.map((param, index) => (
                    <label key={index}>
                      {param.name || `arg${index}`} ({param.format("sighash")})
                      <input type="text" name={index} />
                    </label>
                  ))}

                  {method.stateMutability === "payable" && (
                    <label>
                      Value (native currency)
                      <input type="text" name="value" defaultValue="0" />
                    </label>
                  )}
                </div>
              </form>
            ))}
          </section>
        ))}
      </fieldset>

      <pre>
        {JSON.stringify(
          result,
          (_, value) => typeof value === "bigint" ? value.toString() : value,
          2,
        )}
      </pre>
    </main>
  );
}
