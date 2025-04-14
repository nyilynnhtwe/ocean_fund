import { useState } from "react";

interface DonationFormProps {
    fundraiserId: number;
    donateToFundraiser: (fundraiserId: number, donationAmount: string, donorName: string, note: string) => void;
    tokenSymbol: string;
    isConnected: boolean;
}

const DonationForm: React.FC<DonationFormProps> = ({ 
    fundraiserId, 
    donateToFundraiser, 
    tokenSymbol,
    isConnected 
}) => {
    const [donationAmount, setDonationAmount] = useState<string>("");
    const [donorName, setDonorName] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isConnected) {
            alert("Please connect your wallet to make a donation");
            return;
        }

        if (!donationAmount || !donorName) {
            alert("Please fill out required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await donateToFundraiser(fundraiserId, donationAmount, donorName, note);
            setDonationAmount("");
            setDonorName("");
            setNote("");
        } catch (error) {
            console.error("Donation failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-inner space-y-3 mt-4">
            <div className="flex flex-col">
                <label className="text-sm font-medium text-[#023E8A] mb-1">Name *</label>
                <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="border border-[#90E0EF] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    placeholder="Your name"
                    required
                    disabled={!isConnected}
                />
            </div>
            <div className="flex flex-col">
                <label className="text-sm font-medium text-[#023E8A] mb-1">
                    Donation Amount ({tokenSymbol}) *
                </label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="border border-[#90E0EF] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    placeholder={`Enter amount in ${tokenSymbol}`}
                    required
                    disabled={!isConnected}
                />
            </div>
            <div className="flex flex-col">
                <label className="text-sm font-medium text-[#023E8A] mb-1">Note (optional)</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="border border-[#90E0EF] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    rows={2}
                    placeholder="Write a short note..."
                    disabled={!isConnected}
                ></textarea>
            </div>
            <button
                type="submit"
                disabled={!isConnected || isSubmitting}
                className={`w-full text-white font-medium py-2 px-4 rounded-lg transition duration-200 ${
                    !isConnected 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : isSubmitting 
                            ? "bg-[#0096C7] cursor-wait" 
                            : "bg-[#0077B6] hover:bg-[#0096C7]"
                }`}
            >
                {isSubmitting ? "Processing..." : "Donate"}
            </button>
            
            {!isConnected && (
                <p className="text-sm text-center text-red-600 mt-2">
                    Connect your wallet to make a donation
                </p>
            )}
        </form>
    );
};

export default DonationForm;