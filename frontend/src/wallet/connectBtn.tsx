import React from "react";
import { Button } from "../ui/Button";
import { useWallet, shortenAddress } from "../configs/web3";
import { Wallet } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

const ConnectButton: React.FC = () => {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet();

  if (isConnecting) {
    return (
      <Button disabled className="flex items-center">
        <Skeleton className="h-4 w-24" />
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <Button
        variant="outline"
        className="flex items-center"
        onClick={disconnectWallet}
      >
        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
        <span className="truncate max-w-[120px]">
          {shortenAddress(account)}
        </span>
      </Button>
    );
  }

  return (
    <Button className="" onClick={connectWallet}>
      <Wallet className="w-5 h-5 mr-2" />
      Connect Wallet
    </Button>
  );
};

export default ConnectButton;
