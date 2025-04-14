import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers } from "ethers";
import { useToast } from "../hooks/useToast";

interface WalletContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => { },
  disconnectWallet: () => { },
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { toast } = useToast();

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        toast({
          title: "MetaMask not found",
          description: "Please install MetaMask to use this application",
          variant: "destructive",
        });
        return;
      }

      setIsConnecting(true);

      // // Set Custom RPC
      // await window.ethereum.request({
      //   jsonrpc: '2.0',
      //   method: 'wallet_addEthereumChain',
      //   params: [
      //     {
      //       chainId: '0xaa36A7',
      //       chainName: 'Sepolia Testnet',
      //       nativeCurrency: {
      //         name: 'Ethereum Sepolia',
      //         symbol: 'ETH',
      //         decimals: 18,
      //       },
      //       rpcUrls: ['https://blockchain.googleapis.com/v1/projects/apac-solution-challenge/locations/asia-east1/endpoints/ethereum-sepolia/rpc?key=AIzaSyCfxmFhTSjE8gypi9YlYxfzZA_ZVJy2nms'],
      //       blockExplorerUrls: ['https://sepolia.etherscan.io/'],
      //     },
      //   ],
      // });

      // Create provider
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);

      // Request accounts
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setAccount(address);

      // Get network
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));

      // Get signer
      const ethSigner = await browserProvider.getSigner();
      setSigner(ethSigner);

      setIsConnected(true);

      // Save connection status
      localStorage.setItem("isWalletConnected", "true");

      toast({
        title: "Wallet connected",
        description: `Connected to ${shortenAddress(address)}`,
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    localStorage.removeItem("isWalletConnected");

    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  }, [toast]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      const shouldAutoConnect = localStorage.getItem("isWalletConnected") === "true";
      if (shouldAutoConnect && window.ethereum) {
        try {
          await connectWallet();
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      }
    };

    autoConnect();
  }, [connectWallet]);

  // Handle account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (isConnected) {
          setAccount(accounts[0]);
          toast({
            title: "Account changed",
            description: `Switched to ${shortenAddress(accounts[0])}`,
          });
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        if (isConnected) {
          setChainId(parseInt(chainIdHex, 16));
          window.location.reload();
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [disconnectWallet, isConnected, toast]);

  // Creating context value separately to avoid JSX parsing issues
  const contextValue = {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Helper function to shorten an Ethereum address
export const shortenAddress = (address: string, chars = 4) => {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

// Add global ethereum interface
declare global {
  interface Window {
    ethereum: any;
  }
}
