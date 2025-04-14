import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";
import { Fundraiser } from "../pages/FundraisingPlatform";
import { FUNDRAISING_PLATFORM_CONTRACT_ADDRESS, PAYUSD_CONTRACT_ADDRESS } from "../configs/config";
import FundraisingPlatformABI from "../abis/FundraisingPlatform.json";
import PayUsd from "../abis/PayUSD.json";
import DonationForm from "../components/DonationForm";
import { Button } from "@radix-ui/themes";
import { Link, useLocation } from "wouter";
import ConnectButton from "../wallet/connectBtn";
import { useWallet } from "../configs/web3";
import { useToast } from "../hooks/useToast";
import CampaignTabs from "./CampaignTabs";

interface Donation {
    donor: string;
    donorName: string;
    note: string;
    amount: number;
}

const DonorPage: React.FC = () => {
    const { provider, account, signer, chainId, isConnected } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
    const [tokenSymbol, setTokenSymbol] = useState<string>("PYUSD");
    const [donations, setDonations] = useState<{ [key: number]: Donation[] }>({});
    const [pyusdBalance, setPyusdBalance] = useState<string>('0.00');
    const [expandedFundraiser, setExpandedFundraiser] = useState<number | null>(null);
    const [loadingDonations, setLoadingDonations] = useState<number[]>([]);

    // Add these filtered campaign lists
    const activeCampaigns = fundraisers.filter(
        (f) => Date.now() / 1000 < f.deadline && !f.isClosed
    );

    const endedCampaigns = fundraisers.filter(
        (f) => Date.now() / 1000 >= f.deadline || f.isClosed
    );

    // Get current path
    const [location] = useLocation();
    const isActivePage = location.includes("/active");

    const { toast } = useToast();

    const fetchBalance = useCallback(async () => {
        if (!account || !provider) {
            setPyusdBalance('0.00');
            return;
        }

        try {
            const payUSDContract = new ethers.Contract(
                PAYUSD_CONTRACT_ADDRESS,
                PayUsd.payusdERCAbi,
                provider
            );
            const balance = await payUSDContract.balanceOf(account);
            const formatted = ethers.formatUnits(balance, 6);
            setPyusdBalance(Number(formatted).toFixed(2));
        } catch (error) {
            console.error("Error fetching balance:", error);
            setPyusdBalance('0.00');
        }
    }, [account, provider]);


    const fetchFundraisers = async () => {
        try {
            const providerOrSigner = signer || provider;
            if (!providerOrSigner) {
                console.error("No provider or signer available");
                return;
            }

            const fundraisingContract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                providerOrSigner
            );

            setContract(fundraisingContract);
            const fundraiserCountBN = await fundraisingContract.fundraiserCount();
            const count = Number(fundraiserCountBN);
            const fundraiserArray: Fundraiser[] = [];

            for (let i = 1; i <= count; i++) {
                const fs = await fundraisingContract.fundraisers(i);
                fundraiserArray.push({
                    id: i,
                    organizer: fs.organizer,
                    name: fs.name,
                    goal: Number(fs.goal),
                    deadline: Number(fs.deadline),
                    totalDonations: Number(fs.totalDonations),
                    isClosed: fs.isClosed,
                });
            }
            setFundraisers(fundraiserArray);
        } catch (error) {
            console.error("Error fetching fundraisers:", error);
        }
    };

    const fetchDonations = async (fundraiserId: number) => {
        if (contract) {
            setLoadingDonations(prev => [...prev, fundraiserId]);
            try {
                const donations = await contract.getDonations(fundraiserId);
                setDonations(prev => ({
                    ...prev,
                    [fundraiserId]: donations.map((d: any) => ({
                        donor: d.donor,
                        donorName: d.donorName,
                        note: d.note,
                        amount: Number(d.amount)
                    }))
                }));
            } catch (error) {
                console.error("Error fetching donations:", error);
                toast({
                    variant: "destructive",
                    title: "Error Loading Donations",
                    description: "Could not fetch donation history"
                });
            } finally {
                setLoadingDonations(prev => prev.filter(id => id !== fundraiserId));
            }
        }
    };


    const donateToFundraiser = async (
        fundraiserId: number,
        donationAmount: string,
        donorName: string,
        note: string
    ) => {
        if (!signer) {
            toast({
                variant: "destructive",
                title: "Wallet Not Connected",
                description: "Please connect your wallet to donate"
            });
            return;
        }

        try {
            const toastId = toast({
                variant: "info",
                title: "Processing Donation...",
                description: "Please approve the transaction"
            });

            const payUSDContract = new ethers.Contract(
                PAYUSD_CONTRACT_ADDRESS,
                PayUsd.abi,
                signer
            );

            const amountInUnits = donationAmount;

            // Approval process
            const approveTx = await payUSDContract.approve(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                amountInUnits
            );
            await approveTx.wait();

            // Donation process
            const fundraisingContract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                signer
            );

            const tx = await fundraisingContract.donate(
                fundraiserId,
                donorName,
                note,
                amountInUnits
            );

            // Update toast
            toast({
                id: toastId,
                variant: "info",
                title: "Processing...",
                description: "Confirming transaction"
            });

            await tx.wait();

            // Refresh data
            await Promise.all([
                fetchFundraisers(),
                fetchDonations(fundraiserId),
                fetchBalance()
            ]);

            toast({
                id: toastId,
                variant: "success",
                title: "Donation Successful!",
                description: `Thank you for donating ${donationAmount} PYUSD`
            });

        } catch (error) {
            console.error("Error donating:", error);
            let errorMessage = "Could not complete donation";
            if (error instanceof Error) errorMessage = error.message;

            toast({
                variant: "destructive",
                title: "Donation Failed",
                description: errorMessage
            });
        }
    };



    useEffect(() => {
        fetchFundraisers();
        fetchBalance();
    }, [account, signer, provider, fetchBalance]);
    console.log(isActivePage);
    
    const displayedCampaigns = isActivePage ? activeCampaigns : endedCampaigns;


    return (
        <div className="min-h-screen bg-gradient-to-b from-[#CAF0F8] to-[#ADE8F4] p-4">
            <header className="bg-[#03045E] text-[#CAF0F8] shadow-lg p-6 mb-8 rounded-b-xl">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold text-center mb-2 font-serif">
                        🌊 OceanFund
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-4">
                        {isConnected && (
                            <div className="bg-white/10 px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm border border-[#48CAE4]/20">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-[#00B4D8]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="text-sm">Balance:</span>
                                <span className="font-medium">{pyusdBalance} PYUSD</span>
                            </div>
                        )}
                        <ConnectButton />
                    </div>

                    <Link href="/">
                        <div className="flex justify-center mt-4">
                            <Button className="bg-[#0077B6] hover:bg-[#0096C7] px-4 py-2 rounded-lg text-[#CAF0F8]">
                                ← Back to Home
                            </Button>
                        </div>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <CampaignTabs
                    activeCount={activeCampaigns.length}
                    endedCount={endedCampaigns.length}
                />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayedCampaigns.map((fundraiser) => {
                        const progress =
                            Number(fundraiser.totalDonations) > 0
                                ? (Number(fundraiser.totalDonations) / Number(fundraiser.goal)) * 100
                                : 0;

                        const isExpired = Date.now() / 1000 > fundraiser.deadline;

                        return (
                            <div
                                key={fundraiser.id}
                                className="bg-white p-5 rounded-xl shadow-lg border-2 border-[#48CAE4] hover:shadow-xl transition-shadow"
                            >


                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-xl font-semibold text-[#03045E]">{fundraiser.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm ${isExpired ? 'bg-[#FF6B6B] text-[#600000]' : 'bg-[#48CAE4] text-[#023E8A]'}`}>
                                        {isExpired ? 'Ended' : 'Active'}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#0077B6]">Organizer:</span>
                                        <span className="font-mono text-[#03045E] truncate max-w-[150px]">
                                            {fundraiser.organizer}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#0077B6]">Goal:</span>
                                        <span className="font-medium text-[#03045E]">
                                            {fundraiser.goal} {tokenSymbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#0077B6]">Raised:</span>
                                        <span className="font-medium text-[#03045E]">
                                            {fundraiser.totalDonations} {tokenSymbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#0077B6]">Deadline:</span>
                                        <span className="text-[#03045E]">
                                            {new Date(fundraiser.deadline * 1000).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative pt-1 mb-4">
                                    <div className="flex mb-2 items-center justify-between">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-[#0077B6] h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <DonationForm
                                    fundraiserId={fundraiser.id}
                                    donateToFundraiser={donateToFundraiser}
                                    tokenSymbol={tokenSymbol}
                                    isConnected={isConnected}
                                />

                                <div className="mt-4 space-y-4">

                                    {/* Add donations toggle button */}
                                    <button
                                        onClick={() => {
                                            if (expandedFundraiser === fundraiser.id) {
                                                setExpandedFundraiser(null);
                                            } else {
                                                setExpandedFundraiser(fundraiser.id);
                                                if (!donations[fundraiser.id]) fetchDonations(fundraiser.id);
                                            }
                                        }}
                                        className="w-full text-[#0077B6] hover:text-[#023E8A] text-sm flex items-center justify-center gap-1"
                                    >
                                        {expandedFundraiser === fundraiser.id ? 'Hide' : 'Show'} Donations
                                        <svg
                                            className={`w-4 h-4 transition-transform ${expandedFundraiser === fundraiser.id ? 'rotate-180' : ''
                                                }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>



                                    {/* Donations list */}
                                    {expandedFundraiser === fundraiser.id && (
                                        <div className="border-t pt-4">
                                            <h4 className="font-medium text-[#023E8A] mb-2">Recent Donations:</h4>
                                            {donations[fundraiser.id]?.length > 0 ? (
                                                donations[fundraiser.id].map((donation, index) => (
                                                    <div key={index} className="py-3 px-4 bg-white/30 rounded-lg mb-2">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium text-[#03045E]">
                                                                    {donation.donorName || 'Anonymous'}
                                                                </div>
                                                                {donation.note && (
                                                                    <p className="text-sm text-gray-600 mt-1">"{donation.note}"</p>
                                                                )}
                                                            </div>
                                                            <div className="text-[#0077B6] font-semibold">
                                                                {donation.amount.toFixed(2)} {tokenSymbol}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Donor: {donation.donor.slice(0, 6)}...{donation.donor.slice(-4)}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-4 text-center text-gray-500">
                                                    No donations yet. Be the first to support!
                                                </div>
                                            )}
                                        </div>)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {displayedCampaigns.length === 0 && (
                    <div className="text-center text-[#03045E] py-8">
                        {isActivePage
                            ? "No active campaigns found. Start a new one!"
                            : "No ended campaigns found"}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DonorPage;