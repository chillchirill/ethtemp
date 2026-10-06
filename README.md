# Contract Console

Node.js 24. Run `npm install`, then `npm run node` in a separate terminal.
Set `PUBLIC_ADDRESS` and `PRIVATE_KEY` in `blockchain/.env`.
Set the contract, constructor arguments and network in `blockchain/deploy.js`.

`npm run deploy` compiles and deploys. `npm run deploy:artifact` uses existing artifacts.
`npm run dev` starts the frontend. `npm run build` builds it. `npm run wallet` prints new keys.

Add the network to your browser wallet. Arrays and tuples use JSON; booleans use `true` / `false`.

Select a browser wallet from the dropdown and click **Connect wallet** to grant access.
Previously authorized accounts are restored automatically. Account and network changes,
including disconnection, update the interface without reloading. Transactions use the
selected wallet; read-only calls use the configured RPC URL.

Wallet discovery uses [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963), with a
`window.ethereum` fallback for older extensions. Wallet events follow
[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193).

`npm test` checks wallet discovery, switching, events, and connection races.
