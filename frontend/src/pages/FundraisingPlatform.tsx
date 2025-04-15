import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import FundraisingPlatformABI from "../abis/FundraisingPlatform.json";
import PayUsdABI from "../abis/PayUSD.json";
import { FUNDRAISING_PLATFORM_CONTRACT_ADDRESS, PAYUSD_CONTRACT_ADDRESS } from "../configs/config";
import ConnectButton from "../wallet/connectBtn";
import { useWallet } from "../configs/web3";
import { Link } from "wouter";
import { Button } from "@radix-ui/themes";
import { useToast } from "../hooks/useToast";

export interface Fundraiser {
    id: number;
    organizer: string;
    name: string;
    goal: number; // Change to string
    deadline: number;
    totalDonations: number; // Change to string
    isClosed: boolean;
}

interface Donation {
    donor: string;
    donorName: string;
    note: string;
    amount: number;
}

interface DonationFormProps {
    fundraiserId: number;
    donateToFundraiser: (
        fundraiserId: number,
        donationAmount: string,
        donorName: string,
        note: string
    ) => Promise<void>;
    tokenSymbol: string;
}

const FundraisingPlatform: React.FC = () => {
    const { provider, account, signer, chainId, isConnected } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [fundraisers, setFundraisers] = useState<Fundraiser[]>([]);
    const tokenSymbol = "PYUSD";
    const [expandedFundraiser, setExpandedFundraiser] = useState<number | null>(null);
    const [donations, setDonations] = useState<{ [key: number]: Donation[] }>({});
    const [newFundraiser, setNewFundraiser] = useState({
        name: "",
        goal: "",
        days: 0,
        hours: 0,
        minutes: 0,
    });

    // Inside the FundraisingPlatform component
    const [pyusdBalance, setPyusdBalance] = useState<string>('0.00');

    const fetchBalance = useCallback(async () => {
        if (!account || !provider) {
            setPyusdBalance('0.00');
            return;
        }
        try {
            const payUSDContract = new ethers.Contract(
                PAYUSD_CONTRACT_ADDRESS,
                PayUsdABI.payusdERCAbi,
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

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const { toast } = useToast();


    const fetchFundraisers = useCallback(async () => {
        try {
            const runner = signer ?? provider;
            if (!runner) {
                console.error("No provider or signer available");
                return;
            }

            const fundraisingContract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                runner
            );
            setContract(fundraisingContract);
            const fundraiserCountBN = await fundraisingContract.fundraiserCount();
            const count = parseInt(fundraiserCountBN.toString());
            const fundraiserArray: Fundraiser[] = [];

            for (let i = 1; i <= count; i++) {
                const fs = await fundraisingContract.fundraisers(i);
                console.log();

                if (fs.organizer?.toLowerCase() === account) {
                    fundraiserArray.push({
                        id: parseInt(fs.id.toString()),
                        organizer: fs.organizer,
                        name: fs.name,
                        goal: fs.goal,
                        deadline: parseInt(fs.deadline.toString()),
                        totalDonations: fs.totalDonations,
                        isClosed: fs.isClosed,
                    });
                }
            }



            setFundraisers(fundraiserArray);
        } catch (error) {
            console.error("Error fetching fundraisers:", error);
        }
    }, [signer, provider, account]); // Add dependencies


    const fetchDonations = useCallback(async (fundraiserId: number) => {
        if (contract) {
            try {
                const donations = await contract.getDonations(fundraiserId);
                setDonations(prev => ({
                    ...prev,
                    [fundraiserId]: donations
                }));
            } catch (error) {
                console.error("Error fetching donations:", error);
            }
        }
    }, [contract, toast]);
    // Update the createFundraiser function
    const createFundraiser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (contract && provider) {
            try {
                console.log("lee");
                // Show loading toast
                const toastId = toast({
                    variant: "info",
                    title: "🚀 Creating Campaign...",
                    description: "Please confirm the transaction in your wallet",
                });

                // Convert values
                const days = Number(newFundraiser.days) || 0;
                const hours = Number(newFundraiser.hours) || 0;
                const minutes = Number(newFundraiser.minutes) || 0;
                const totalSeconds = (days * 86400) + (hours * 3600) + (minutes * 60);

                // Validate duration
                if (totalSeconds < 60) {
                    toast({
                        variant: "destructive",
                        title: "Invalid Duration",
                        description: "Campaign must last at least 1 minute",
                    });
                    return;
                }

                // Convert goal to token units (6 decimals for PYUSD)
                const goalInUnits = Number(newFundraiser.goal);

                // Send transaction
                const tx = await contract.createFundraiser(
                    newFundraiser.name,
                    goalInUnits,
                    totalSeconds
                );

                // Update toast to loading state
                toast({
                    variant: "info",
                    title: "⏳ Processing...",
                    description: "Waiting for transaction confirmation",
                });

                // Wait for transaction confirmation
                await tx.wait();

                await fetchBalance();
                // Success notification
                toast({
                    variant: "success",
                    title: "🎉 Campaign Launched!",
                    description: "Your fundraising campaign is now live!",
                });

                // Reset form and refresh list
                setNewFundraiser({ name: "", goal: "", days: 0, hours: 0, minutes: 0 });
                fetchFundraisers();

            } catch (error) {
                console.error("Error creating fundraiser:", error);
                let errorMessage = "Failed to create campaign";

                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === "string") {
                    errorMessage = error;
                }

                toast({
                    variant: "destructive",
                    title: "🚨 Creation Failed",
                    description: errorMessage,
                });
            }
        }
        else {
            console.log("eee");

        }
    };


    // Update donateToFundraiser function
    const donateToFundraiser = async (
        fundraiserId: number,
        donationAmount: string,
        donorName: string,
        note: string
    ) => {
        if (contract && provider) {
            try {
                const toastId = toast({
                    variant: "info",
                    title: "💸 Processing Donation...",
                    description: "Please approve the transaction",
                });

                const amountInUnits = Number(donationAmount);
                // Approval process
                const payUSDContract = new ethers.Contract(
                    PAYUSD_CONTRACT_ADDRESS,
                    PayUsdABI.abi,
                    signer
                );


                // Update toast for donation processing
                toast({
                    variant: "info",
                    title: "⏳ Processing Donation...",
                    description: "Confirming transaction",
                });

                const approveTx = await payUSDContract.approve(
                    FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                    amountInUnits
                );
                await approveTx.wait();
                await fetchBalance();

                const tx = await contract.donate(
                    fundraiserId,
                    donorName,
                    note,
                    amountInUnits
                );

                await tx.wait();
                await fetchBalance();
                toast({
                    variant: "success",
                    title: "🎉 Donation Successful!",
                    description: "Thank you for your support!",
                });

                fetchFundraisers();
            } catch (error) {
                console.error("Error donating:", error);
                let errorMessage = "Could not complete donation";

                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === "string") {
                    errorMessage = error;
                }

                toast({
                    variant: "destructive",
                    title: "❌ Donation Failed",
                    description: errorMessage,
                });
            }
        }
    };

    // Update handleWithdraw function
    const handleWithdraw = async (fundraiserId: number) => {
        if (contract) {
            try {
                const toastId = toast({
                    variant: "info",
                    title: "🏦 Withdrawing Funds...",
                    description: "Processing your request",
                });

                const tx = await contract.withdrawFunds(fundraiserId);

                toast({
                    variant: "info",
                    title: "⏳ Processing...",
                    description: "Waiting for confirmation",
                });

                await tx.wait();
                await fetchBalance();
                toast({
                    variant: "success",
                    title: "✅ Withdrawal Complete!",
                    description: "Funds transferred to your wallet",
                });

                fetchFundraisers();
            } catch (error) {
                console.error("Error withdrawing funds:", error);
                let errorMessage = "Could not complete withdrawal";

                // Add proper error typing
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else if (typeof error === "string") {
                    errorMessage = error;
                }

                toast({
                    variant: "destructive",
                    title: "❌ Withdrawal Failed",
                    description: errorMessage,
                });
            }
        }
    };


    const calculateTotalDuration = () => {
        const days = newFundraiser.days || 0;
        const hours = newFundraiser.hours || 0;
        const minutes = newFundraiser.minutes || 0;

        const format = (value: number, unit: string) =>
            value > 0 ? `${value}${unit} ` : '';

        return [
            format(days, 'd'),
            format(hours, 'h'),
            format(minutes, 'm')
        ].join('').trim() || '0m';
    };

    useEffect(() => {
        if (provider || signer) {
            fetchFundraisers();
        }
    }, [provider, signer, chainId]); // Correct dependencies


    useEffect(() => {
        if (!contract) return;

        const handleFundraiserCreated = (
            id: ethers.BigNumberish,
            organizer: string,
            name: string,
            goal: ethers.BigNumberish,
            deadline: ethers.BigNumberish
        ) => {
            // Only show notification for current user's campaigns
            if (organizer.toLowerCase() === account?.toLowerCase()) {
                toast({
                    variant: "info",
                    title: "🎉 New Campaign Created!",
                    description: `Your campaign "${name}" is now live!`,
                });
                fetchFundraisers();
            }
        };

        const handleDonationReceived = (
            fundraiserId: ethers.BigNumberish,
            donor: string,
            donorName: string,
            note: string,
            amount: ethers.BigNumberish
        ) => {
            const id = Number(fundraiserId);
            const formattedAmount = ethers.formatUnits(amount, 6);

            // Find the affected fundraiser
            const fundraiser = fundraisers.find(f => f.id === id);
            if (fundraiser) {
                toast({
                    variant: "success",
                    title: "💸 New Donation!",
                    description: `${donorName} donated ${formattedAmount} PYUSD to ${fundraiser.name}`,
                });

                // Update local state immediately
                setFundraisers(prev => prev.map(f =>
                    f.id === id ? {
                        ...f,
                        totalDonations: f.totalDonations + Number(formattedAmount)
                    } : f
                ));

                // Refresh donations list
                fetchDonations(id);
            }
        };

        contract.on("FundraiserCreated", handleFundraiserCreated);
        contract.on("DonationReceived", handleDonationReceived);

        return () => {
            contract.off("FundraiserCreated", handleFundraiserCreated);
            contract.off("DonationReceived", handleDonationReceived);
        };
    }, [contract, account, fundraisers, fetchFundraisers, fetchDonations, toast]);


    useEffect(() => {
        if (!contract) return;

        const handleFundsWithdrawn = (fundraiserId: ethers.BigNumberish) => {
            const id = Number(fundraiserId);
            toast({
                variant: "success",
                title: "💰 Funds Withdrawn",
                description: "Funds have been successfully distributed",
            });

            // Update local state
            setFundraisers(prev => prev.map(f =>
                f.id === id ? { ...f, isClosed: true } : f
            ));
        };

        contract.on("WithdrawFunds", handleFundsWithdrawn);
        return () => {
            contract.off("WithdrawFunds", handleFundsWithdrawn);
        };
    }, [contract, toast]);
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

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Fundraiser Section */}
                <section className="bg-[#CAF0F8] p-6 shadow-xl rounded-2xl border-2 border-[#00B4D8] max-h-[600px] overflow-hidden flex flex-col">
                    <h2 className="text-2xl font-bold mb-6 text-[#03045E] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[#0077B6]" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create New Campaign
                    </h2>

                    <div className="flex-1 overflow-y-auto pr-2"> {/* Scrollable container */}
                        <form onSubmit={createFundraiser} className="space-y-4"> {/* Reduced spacing */}
                            <div>
                                <label className="block text-sm font-medium text-[#023E8A] mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Save Coral Reefs"
                                    className="w-full px-4 py-2 rounded-lg border-2 border-[#48CAE4] focus:ring-2 focus:ring-[#0096C7] focus:border-[#0077B6] outline-none transition-all"
                                    value={newFundraiser.name}
                                    onChange={(e) => setNewFundraiser({ ...newFundraiser, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> {/* Responsive grid */}
                                <div>
                                    <label className="block text-sm font-medium text-[#023E8A] mb-1">Goal ({tokenSymbol})</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="100"
                                        className="w-full px-4 py-2 rounded-lg border-2 border-[#48CAE4] focus:ring-2 focus:ring-[#0096C7] focus:border-[#0077B6] outline-none transition-all"
                                        value={newFundraiser.goal}
                                        onChange={(e) => setNewFundraiser({ ...newFundraiser, goal: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Time Input Group */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-[#023E8A] mb-1">Days</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                className="w-full px-4 py-2 rounded-lg border-2 border-[#48CAE4] focus:ring-2 focus:ring-[#0096C7] focus:border-[#0077B6] outline-none transition-all"
                                                value={newFundraiser.days}
                                                onChange={(e) => setNewFundraiser({ ...newFundraiser, days: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#023E8A] mb-1">Hours</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                max="23"
                                                className="w-full px-4 py-2 rounded-lg border-2 border-[#48CAE4] focus:ring-2 focus:ring-[#0096C7] focus:border-[#0077B6] outline-none transition-all"
                                                value={newFundraiser.hours}
                                                onChange={(e) => setNewFundraiser({ ...newFundraiser, hours: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#023E8A] mb-1">Mins</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                max="59"
                                                className="w-full px-4 py-2 rounded-lg border-2 border-[#48CAE4] focus:ring-2 focus:ring-[#0096C7] focus:border-[#0077B6] outline-none transition-all"
                                                value={newFundraiser.minutes}
                                                onChange={(e) => setNewFundraiser({ ...newFundraiser, minutes: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#0077B6] text-center">
                                        Total duration: {calculateTotalDuration()}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[#48CAE4]/20 mt-4">
                                <button
                                    type="submit"
                                    className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-[#CAF0F8] py-3 rounded-lg font-medium transition-all transform hover:scale-[1.01] active:scale-95"
                                >
                                    Launch Campaign 🌟
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* Active Fundraisers Section */}
                <section className="space-y-6 w-full">
                    <h2 className="text-2xl font-bold text-[#03045E] mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[#0077B6]" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Your Campaigns
                    </h2>
                    {fundraisers.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-[#00B4D8] text-center">
                            <div className="text-6xl mb-4">🌊</div>
                            <h3 className="text-xl text-[#03045E] mb-2">No active campaigns found</h3>
                            <p className="text-[#0077B6]">Be the first to create one!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

                            {fundraisers.map((fs) => {
                                const currentTime = Date.now() / 1000;
                                const isEnded = currentTime > fs.deadline;
                                const totalDonations = Number(fs.totalDonations);
                                const goal = Number(fs.goal);
                                const canWithdraw = totalDonations >= goal || (isEnded && totalDonations > 0);

                                return (
                                    <div key={fs.id}
                                        className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-[#48CAE4]/30 w-full" // Remove min/max-width and mx-auto
                                    >
                                        {/* Header Section */}
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-bold text-[#03045E] truncate max-w-[70%]">
                                                {fs.name}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${Date.now() / 1000 > fs.deadline
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {Date.now() / 1000 > fs.deadline ? (
                                                    <span className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        Ended
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Active
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-6">
                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#00B4D8] rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Number(fs.totalDonations) > 0
                                                            ? Number(fs.goal) / Number(fs.totalDonations) * 100 : 0}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-sm text-[#0077B6] mt-2">
                                                <span>
                                                    {Number(fs.totalDonations)} {tokenSymbol}
                                                </span>
                                                <span>
                                                    {Number(fs.goal)} {tokenSymbol}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="space-y-1">
                                                <label className="text-sm text-[#0077B6]">Organizer</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-[#03045E] truncate">
                                                        {fs.organizer}
                                                    </span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(fs.organizer)}
                                                        className="text-[#48CAE4] hover:text-[#0096C7]"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-sm text-[#0077B6]">Deadline</label>
                                                <div className="font-medium text-[#03045E]">
                                                    {new Date(fs.deadline * 1000).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                    {Date.now() / 1000 < fs.deadline && (
                                                        <div className="text-sm text-gray-500">
                                                            {(Math.ceil(fs.deadline - (Date.now() / 1000)) / 86400).toFixed(2)} days left
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Donation Section */}
                                        <DonationForm
                                            fundraiserId={fs.id}
                                            donateToFundraiser={donateToFundraiser}
                                            tokenSymbol={tokenSymbol}
                                        />

                                        {/* Action Buttons */}
                                        <div className="mt-6 space-y-3">
                                            {account === fs.organizer.toLowerCase() && !fs.isClosed && (
                                                <div className="space-y-3">
                                                    {/* Withdraw Button */}
                                                    <button
                                                        onClick={() => handleWithdraw(fs.id)}
                                                        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${canWithdraw
                                                            ? 'bg-[#00B4D8] text-white hover:bg-[#0096C7]'
                                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                            }`}
                                                        disabled={!canWithdraw}
                                                    >
                                                        {canWithdraw ? (
                                                            <>
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                </svg>
                                                                Withdraw Funds
                                                            </>
                                                        ) : isEnded ? (
                                                            'No Donations to Withdraw'
                                                        ) : (
                                                            'Goal Not Met'
                                                        )}
                                                    </button>

                                                    {/* Share on Twitter Button */}
                                                    {!isEnded && (
                                                        <button
                                                            onClick={() => {
                                                                const campaignUrl = `${window.location.origin}/campaign/${fs.id}`;
                                                                const tweetText = encodeURIComponent(
                                                                    `Check out this awesome campaign on OceanFund 🌊\n"${fs.name}"\n\n${campaignUrl}\n\n#OceanFund #Ethereum #Google #PayUSD #Paypal #Crypto`
                                                                );
                                                                const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
                                                                window.open(tweetUrl, '_blank');
                                                            }}
                                                            className="w-full bg-[#48CAE4] hover:bg-[#00B4D8] text-[#023E8A] py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                                                        >
                                                            <svg
                                                                className="w-5 h-5 fill-current"
                                                                viewBox="0 0 24 24"
                                                                aria-hidden="true"
                                                            >
                                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                            </svg>
                                                            Share on Twitter
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Show Donations Toggle */}
                                            <button
                                                onClick={() => {
                                                    if (expandedFundraiser === fs.id) {
                                                        setExpandedFundraiser(null);
                                                    } else {
                                                        setExpandedFundraiser(fs.id);
                                                        if (!donations[fs.id]) fetchDonations(fs.id);
                                                    }
                                                }}
                                                className="w-full text-[#0077B6] hover:text-[#023E8A] text-sm flex items-center justify-center gap-1"
                                            >
                                                {expandedFundraiser === fs.id ? 'Hide' : 'Show'} Donations
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${expandedFundraiser === fs.id ? 'rotate-180' : ''
                                                        }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Donations List */}
                                            {expandedFundraiser === fs.id && (
                                                <div className="pt-4 border-t border-[#48CAE4]/20">
                                                    <h4 className="text-sm font-semibold text-[#023E8A] mb-3">Recent Donations</h4>
                                                    {donations[fs.id]?.length > 0 ? (
                                                        donations[fs.id].map((donation, index) => (
                                                            <div key={index} className="py-3 px-4 bg-[#CAF0F8]/30 rounded-lg mb-2 last:mb-0">
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
                                                                        {(Math.ceil(Number(donation.amount))).toFixed(3)} {tokenSymbol}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-4 text-center text-gray-500">
                                                            No donations yet. Be the first to support!
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                            )
                            }
                        </div>)}
                </section>
            </main>
        </div>
    );
};

const DonationForm: React.FC<DonationFormProps> = ({
    fundraiserId,
    donateToFundraiser,
    tokenSymbol,
}) => {
    const [donationAmount, setDonationAmount] = useState("");
    const [donorName, setDonorName] = useState("");
    const [note, setNote] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (donationAmount && donorName) {
            await donateToFundraiser(
                fundraiserId,
                donationAmount,
                donorName,
                note
            );
            setDonationAmount("");
            setDonorName("");
            setNote("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <div>
                <label className="block text-gray-700">
                    Donation Amount ({tokenSymbol})
                </label>
                <input
                    type="number"
                    step="0.1"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                    required
                />
            </div>
            <div>
                <label className="block text-gray-700">
                    Donor Name
                </label>
                <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                    required
                />
            </div>
            <div>
                <label className="block text-gray-700">Note</label>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                />
            </div>
            <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
            >
                Donate
            </button>
        </form>
    );
};

export default FundraisingPlatform;