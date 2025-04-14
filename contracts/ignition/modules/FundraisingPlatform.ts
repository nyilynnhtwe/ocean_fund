// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const FundraisingPlatformModule = buildModule("FundraisingPlatformModule", (m) => {
  const fundraisingPlatform = m.contract("FundraisingPlatform", ["0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"], {

  });
  return { fundraisingPlatform };
});

export default FundraisingPlatformModule;

