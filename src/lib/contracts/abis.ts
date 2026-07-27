// Minimal ABIs for the frontend. These mirror the Solidity interfaces in
// contracts/. If you change the contracts, update these too (or import the
// generated artifacts from contracts/artifacts).

export const factoryAbi = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "usernameHash", type: "bytes32" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "tokensCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getTokens",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "creatorFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "function",
    name: "platformFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint16" }],
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "launcher", type: "address", indexed: true },
      { name: "usernameHash", type: "bytes32", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

export const tokenAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "currentPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "marketCap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "monReserve",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "metadataURI",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "creatorUsernameHash",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "quoteBuy",
    stateMutability: "view",
    inputs: [{ name: "monIn", type: "uint256" }],
    outputs: [
      { name: "tokenOut", type: "uint256" },
      { name: "monForCurve", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quoteSell",
    stateMutability: "view",
    inputs: [{ name: "tokenIn", type: "uint256" }],
    outputs: [
      { name: "monOut", type: "uint256" },
      { name: "grossRefund", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [{ name: "minTokensOut", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "minMonOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Trade",
    inputs: [
      { name: "trader", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "monAmount", type: "uint256", indexed: false },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "newSupply", type: "uint256", indexed: false },
      { name: "newPrice", type: "uint256", indexed: false },
      { name: "creatorFee", type: "uint256", indexed: false },
      { name: "platformFee", type: "uint256", indexed: false },
    ],
  },
] as const;

export const escrowAbi = [
  {
    type: "function",
    name: "pending",
    stateMutability: "view",
    inputs: [{ name: "usernameHash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "walletFor",
    stateMutability: "view",
    inputs: [{ name: "usernameHash", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "lifetimeDeposited",
    stateMutability: "view",
    inputs: [{ name: "usernameHash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "isClaimed",
    stateMutability: "view",
    inputs: [{ name: "usernameHash", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "claimFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "usernameHash", type: "bytes32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [],
  },
] as const;
