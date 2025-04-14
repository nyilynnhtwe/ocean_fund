import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { ethers } from "ethers";
import { Link } from "wouter";
import { Button } from "@radix-ui/themes";
import FundraisingPlatformABI from "../abis/FundraisingPlatform.json";
import { FUNDRAISING_PLATFORM_CONTRACT_ADDRESS, PAYUSD_CONTRACT_ADDRESS } from "../configs/config";
import { useWallet } from "../configs/web3";
import DonationForm from "../components/DonationForm";
import { useToast } from "../hooks/useToast";
import PayUsd from "../abis/PayUSD.json";

interface Campaign {
    id: string;
    name: string;
    organizer: string;
    goal: number;
    deadline: number;
    totalDonations: number;
    isClosed: boolean;
}

interface Donation {
    donor: string;
    donorName: string;
    note: string;
    amount: number;
}

const CampaignPage = () => {
    const { id } = useParams();
    const { provider, account, signer } = useWallet();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [donations, setDonations] = useState<Donation[]>([]);
    const [pyusdBalance, setPyusdBalance] = useState('0.00');
    const [expandedDonations, setExpandedDonations] = useState(false);
    const { toast } = useToast();

    const fetchBalance = async () => {
        if (!account || !provider) return;

        try {
            const payUSDContract = new ethers.Contract(
                PAYUSD_CONTRACT_ADDRESS,
                PayUsd.payusdERCAbi,
                provider
            );
            const balance = await payUSDContract.balanceOf(account);
            setPyusdBalance(Number(ethers.formatUnits(balance, 6)).toFixed(2));
        } catch (error) {
            console.error("Error fetching balance:", error);
        }
    };

    const fetchCampaignData = async () => {
        try {
            if (!provider || !id) return;

            const contract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                provider
            );

            const [data, donationData] = await Promise.all([
                contract.fundraisers(id),
                contract.getDonations(id)
            ]);
            console.log({
                id: data.id.toString(),
                name: data.name,
                organizer: data.organizer,
                goal: Number(data.goal),
                deadline: Number(data.deadline),
                totalDonations: Number(data.totalDonations),
                isClosed: data.isClosed
            });

            setCampaign({
                id: data.id.toString(),
                name: data.name,
                organizer: data.organizer,
                goal: Number(data.goal),
                deadline: Number(data.deadline),
                totalDonations: Number(data.totalDonations),
                isClosed: data.isClosed
            });

            setDonations(donationData.map((d: any) => ({
                donor: d.donor,
                donorName: d.donorName,
                note: d.note,
                amount: Number(d.amount)
            })));

            setLoading(false);
        } catch (error) {
            console.error("Error fetching campaign:", error);
            toast({
                variant: "destructive",
                title: "Error Loading Campaign",
                description: "Could not fetch campaign data"
            });
            setLoading(false);
        }
    };

    const donateToFundraiser = async (id:number,amount: string, donorName: string, note: string) => {
        if (!signer || !id) {
            toast({
                variant: "destructive",
                title: "Wallet Not Connected",
                description: "Please connect your wallet to donate"
            });
            return;
        }

        try {
            const payUSDContract = new ethers.Contract(
                PAYUSD_CONTRACT_ADDRESS,
                PayUsd.abi,
                signer
            );

            // Validate amount
            const amountInUnits = Number(amount);

            // Approve transaction
            const approveTx = await payUSDContract.approve(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                amountInUnits
            );
            await approveTx.wait();

            // Execute donation
            const fundraisingContract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                signer
            );

            const tx = await fundraisingContract.donate(
                id,
                donorName,
                note,
                amountInUnits
            );

            await tx.wait();
            await Promise.all([fetchCampaignData(), fetchBalance()]);

            toast({
                variant: "success",
                title: "Donation Successful!",
                description: `Thank you for donating ${amount} PYUSD`
            });

        } catch (error: any) {
            console.error("Donation failed:", error);
            toast({
                variant: "destructive",
                title: "Donation Failed",
                description: error?.message || "Transaction failed"
            });
        }
    };

    const handleWithdraw = async () => {
        if (!signer || !campaign) return;

        try {
            const contract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                signer
            );

            const tx = await contract.withdrawFunds(campaign.id);
            await tx.wait();
            await fetchCampaignData();

            toast({
                variant: "success",
                title: "Withdrawal Successful",
                description: "Funds have been transferred to organizer"
            });

        } catch (error: any) {
            console.error("Withdrawal failed:", error);
            toast({
                variant: "destructive",
                title: "Withdrawal Failed",
                description: error?.message || "Could not complete withdrawal"
            });
        }
    };

    useEffect(() => {
        if (provider && id) {
            fetchCampaignData();
            fetchBalance();
        }
    }, [provider, id, account]);

    if (loading) return <div className="text-center py-8">Loading campaign...</div>;
    if (!campaign) return <div className="text-center py-8">Campaign not found</div>;

    const isExpired = Date.now() / 1000 > campaign.deadline;
    const progress = Math.min((campaign.totalDonations / campaign.goal) * 100, 100);
    const isOrganizer = account?.toLowerCase() === campaign.organizer.toLowerCase();

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#CAF0F8] to-[#ADE8F4] p-4">
            <header className="bg-[#03045E] text-[#CAF0F8] shadow-lg p-6 mb-8 rounded-b-xl">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold text-center mb-2 font-serif">
                        {campaign.name}
                    </h1>
                    <div className="flex justify-center items-center gap-4">
                        <Link href="/">
                            <Button className="bg-[#0077B6] hover:bg-[#0096C7] px-4 py-2 rounded-lg">
                                ← Back to Campaigns
                            </Button>
                        </Link>

                        {/* Add Balance Display */}
                        {account && (
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
                                <div className="flex flex-col">
                                    <span className="text-xs">Your Balance</span>
                                    <span className="font-medium">{pyusdBalance} PYUSD</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">

                    {/* Campaign Status Banner */}
                    {isExpired && (
                        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6 text-center">
                            🚫 This campaign has ended
                        </div>
                    )}



                    {/* Progress Section */}
                    <div className="mb-6">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#00B4D8] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-sm text-[#0077B6] mt-2">
                            <span>{campaign.totalDonations.toFixed(2)} PYUSD Raised</span>
                            <span>Goal: {campaign.goal.toFixed(2)} PYUSD</span>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-sm text-[#0077B6]">Organizer</label>
                            <div className="flex items-center gap-2">
                                <span className="font-mono truncate">
                                    {campaign.organizer}
                                </span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(campaign.organizer)}
                                    className="text-[#48CAE4] hover:text-[#0096C7]"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-[#0077B6]">Deadline</label>
                            <div className="font-medium">
                                {new Date(campaign.deadline * 1000).toLocaleDateString()}
                                {!isExpired && (
                                    <div className="text-sm text-gray-500">
                                        {Math.ceil((campaign.deadline - Date.now() / 1000) / 86400)} days left
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {!isExpired ? (
                        <>
                            {/* Active Campaign Content */}
                            <DonationForm
                                fundraiserId={Number(id)}
                                donateToFundraiser={donateToFundraiser}
                                tokenSymbol="PYUSD"
                                isConnected={!!account}
                            />

                            {/* Withdraw Button (only visible to organizer before expiration) */}
                            {isOrganizer && !campaign.isClosed && (
                                <button
                                    onClick={handleWithdraw}
                                    disabled={campaign.totalDonations < campaign.goal}
                                    className={`w-full mt-4 py-3 rounded-lg font-medium ${campaign.totalDonations >= campaign.goal
                                        ? 'bg-[#00B4D8] hover:bg-[#0096C7] text-white'
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {campaign.totalDonations >= campaign.goal
                                        ? "Withdraw Funds"
                                        : "Goal Not Met"}
                                </button>
                            )}
                        </>
                    ) : (
                        /* Ended Campaign Content */
                        <div className="text-center space-y-4">
                            <div className="text-lg font-semibold text-[#023E8A]">
                                {campaign.totalDonations >= campaign.goal
                                    ? "🎉 Campaign Goal Achieved!"
                                    : "❌ Campaign Goal Not Met"}
                            </div>
                            <p className="text-[#0077B6]">
                                Final amount raised: {campaign.totalDonations.toFixed(2)} PYUSD
                            </p>
                        </div>
                    )}

                    {/* Donations List */}
                    <div className="mt-6">
                        <button
                            onClick={() => setExpandedDonations(!expandedDonations)}
                            className="w-full text-[#0077B6] hover:text-[#023E8A] flex items-center justify-center gap-1"
                        >
                            {expandedDonations ? 'Hide' : 'Show'} Donations
                            <svg
                                className={`w-4 h-4 transition-transform ${expandedDonations ? 'rotate-180' : ''
                                    }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {expandedDonations && (
                            <div className="mt-4 border-t pt-4">
                                {donations.length > 0 ? (
                                    donations.map((donation, index) => (
                                        <div key={index} className="py-3 border-b last:border-0">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium">
                                                        {donation.donorName || 'Anonymous'}
                                                    </div>
                                                    {donation.note && (
                                                        <p className="text-sm text-gray-600">"{donation.note}"</p>
                                                    )}
                                                </div>
                                                <div className="text-[#0077B6] font-semibold">
                                                    {donation.amount.toFixed(2)} PYUSD
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-gray-500">
                                        No donations yet
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CampaignPage;