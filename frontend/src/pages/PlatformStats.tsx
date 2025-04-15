import { useEffect, useState } from "react";
import { ethers } from "ethers";
import FundraisingPlatformABI from "../abis/FundraisingPlatform.json";
import { FUNDRAISING_PLATFORM_CONTRACT_ADDRESS } from "../configs/config";
import { useWallet } from "../configs/web3";

const GOOGLE_SEPOLIA_RPC = import.meta.env.VITE_GOOGLE_SEPOLIA_RPC;

const PlatformStats = () => {
  const { provider, account, signer, chainId, isConnected } = useWallet();
  const [stats, setStats] = useState({
    totalRaised: 0,
    totalEvents: 0
  });

  useEffect(() => {
    if (!provider) return;
    const contract = new ethers.Contract(
      FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
      FundraisingPlatformABI.abi,
      provider
    );
    const fetchStats = async () => {
      try {
        const eventCount = await contract.fundraiserCount();
        let total = 0;

        // Batch fetch all fundraisers
        const fundraiserPromises = [];
        for (let i = 1; i <= eventCount; i++) {
          fundraiserPromises.push(contract.fundraisers(i));
        }

        const allFundraisers = await Promise.all(fundraiserPromises);
        total = allFundraisers.reduce((acc, fundraiser) =>
          acc + Number(fundraiser.totalDonations), 0);

        setStats({
          totalRaised: total,
          totalEvents: Number(eventCount)
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    // Initial fetch
    fetchStats();

    // Event listeners
    const onFundraiserCreated = () => {
      console.log("New fundraiser created - updating stats...");
      fetchStats();
    };

    const onDonationReceived = () => {
      console.log("New donation received - updating stats...");
      fetchStats();
    };

    contract.on("FundraiserCreated", onFundraiserCreated);
    contract.on("DonationReceived", onDonationReceived);

    // Cleanup
    return () => {
      contract.off("FundraiserCreated", onFundraiserCreated);
      contract.off("DonationReceived", onDonationReceived);
    };
  }, [provider]);

  return (
    <section className="max-w-4xl mx-auto mt-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Raised Card */}
        <div className="bg-[#0077B6] p-6 rounded-2xl border-2 border-[#00B4D8] shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stats.totalRaised.toLocaleString()}
              </h3>
              <p className="text-[#CAF0F8]">Total PYUSD Raised</p>
            </div>
          </div>
        </div>

        {/* Total Events Card */}
        <div className="bg-[#023E8A] p-6 rounded-2xl border-2 border-[#48CAE4] shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stats.totalEvents}
              </h3>
              <p className="text-[#CAF0F8]">Active Campaigns</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformStats;