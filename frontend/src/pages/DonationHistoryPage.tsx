import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Link } from "wouter";
import { Button } from "@radix-ui/themes";
import FundraisingPlatformABI from "../abis/FundraisingPlatform.json";
import { FUNDRAISING_PLATFORM_CONTRACT_ADDRESS } from "../configs/config";
import { shortenAddress, useWallet } from "../configs/web3";
import ConnectButton from "../wallet/connectBtn";

interface Donation {
    fundraiserId: number;
    donor: string;
    donorName: string;
    note: string;
    amount: number;
    fundraiserName: string;
    organizer: string;
}

const DonationsHistoryPage = () => {
    const { provider, signer } = useWallet();
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllDonations = async () => {
        try {
            if (!provider) return;

            const contract = new ethers.Contract(
                FUNDRAISING_PLATFORM_CONTRACT_ADDRESS,
                FundraisingPlatformABI.abi,
                provider
            );

            const fundraiserCount = await contract.fundraiserCount();
            const allDonations: Donation[] = [];

            for (let i = 1; i <= fundraiserCount; i++) {
                const [donations, fundraiser] = await Promise.all([
                    contract.getDonations(i),
                    contract.fundraisers(i)
                ]);

                donations.forEach((d: any) => {
                    allDonations.push({
                        fundraiserId: i,
                        donor: d.donor,
                        donorName: d.donorName,
                        note: d.note,
                        amount: Number(d.amount),
                        fundraiserName: fundraiser.name,
                        organizer: fundraiser.organizer
                    });
                });
            }

            setDonations(allDonations.reverse());
            setLoading(false);
        } catch (error) {
            console.error("Error fetching donations:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllDonations();
    }, [provider, signer]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#CAF0F8] to-[#ADE8F4] p-4">
            <header className="bg-[#03045E] text-[#CAF0F8] shadow-lg p-6 mb-8 rounded-b-xl">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold text-center mb-4 font-serif">
                        🌊 All Donations History
                    </h1>
                    <div className="flex justify-center gap-4">
                        <ConnectButton />
                        <Link href="/">
                            <Button className="bg-[#0077B6] hover:bg-[#0096C7] px-4 py-2 rounded-lg">
                                ← Back Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                {loading ? (
                    <div className="text-center text-[#03045E] py-8">Loading donations...</div>
                ) : donations.length === 0 ? (
                    <div className="text-center text-[#03045E] py-8">No donations found</div>
                ) : (
                    <div className="grid gap-6">
                        {donations.map((donation, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-xl shadow-lg border border-[#48CAE4] hover:shadow-xl transition-shadow"
                            >
                                {/* Donor Info Section */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm text-[#0077B6]">Donor Name:</span>
                                            <h3 className="text-xl font-semibold text-[#03045E]">
                                                {donation.donorName || "Anonymous"}
                                            </h3>
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-sm text-[#0077B6]">Campaign:</span>
                                            <p className="text-sm text-[#023E8A] font-medium">
                                                {donation.fundraiserName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-[#0077B6]">Amount:</span>
                                        <p className="text-[#023E8A] font-bold text-xl">
                                            {donation.amount.toFixed(2)} PYUSD
                                        </p>
                                    </div>
                                </div>

                                {/* Donation Note */}
                                {donation.note && (
                                    <div className="bg-[#CAF0F8] p-4 rounded-lg mb-4">
                                        <p className="text-sm text-[#0077B6] mb-1">Donor Note:</p>
                                        <p className="text-[#03045E] italic">"{donation.note}"</p>
                                    </div>
                                )}

                                {/* Metadata Section */}
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#0077B6]">Organized By:</span>
                                        <span className="font-mono text-[#023E8A]">
                                            {shortenAddress(donation.organizer)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#0077B6]">Donor Address:</span>
                                        <span className="font-mono text-[#023E8A]">
                                            {shortenAddress(donation.donor)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};


export default DonationsHistoryPage;