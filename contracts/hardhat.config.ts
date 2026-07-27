import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const MONAD_RPC_URL =
  process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const MONAD_CHAIN_ID = Number(process.env.MONAD_CHAIN_ID ?? 10143);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    monadTestnet: {
      url: MONAD_RPC_URL,
      chainId: MONAD_CHAIN_ID,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
