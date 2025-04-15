import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';


const PRIVATE_KEY = process.env.DEPLOTER_WALLET_PRIVATE_KEY || "0";
const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.GOOGLE_SEPOLIA_RPC,
      accounts: [PRIVATE_KEY]
    }
  }, etherscan: {
    apiKey: {
      'sepolia': process.env.ETHERSCAN_API_KEY || "0"
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com"
        }
      }
    ]
  }
};

export default config;
