import { Button } from "@radix-ui/themes";
import { useState } from "react";
import { Link } from "wouter";
import PlatformStats from "./PlatformStats";

const LandingPage: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<'donor' | 'fundraiser' | null>(null);
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#CAF0F8] to-[#ADE8F4]">
            {/* Hero Section */}
            <header className="bg-[#03045E] text-[#CAF0F8] py-16">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h1 className="text-5xl font-bold mb-6 font-serif">
                        🌊 OceanFund with PYUSD
                    </h1>
                    <p className="text-xl text-[#90E0EF] mb-8">
                        Decentralized Fundraising Powered by Google Cloud & PayPal USD
                    </p>

                    {/* Role Selection */}
                    <div className="flex justify-center gap-6 mb-12">
                        <Link href="/donor">
                            <Button
                                onClick={() => {
                                    setSelectedRole('donor');
                                }}
                                className={`p-8 rounded-2xl transition-all cursor-pointer ${selectedRole === 'donor'
                                    ? 'bg-[#0077B6] border-2 border-[#00B4D8] scale-105'
                                    : 'bg-[#023E8A] hover:bg-[#0096C7] border-2 border-transparent'}`}
                            >
                                <div className="text-4xl mb-4">🤲</div>
                                <h3 className="text-2xl font-bold mb-2">I Want to Donate</h3>
                                <p className="text-[#CAF0F8]">Support causes with PYUSD</p>
                            </Button>
                        </Link>

                        <Link href="/fundraiser">
                            <Button
                                onClick={() => {
                                    setSelectedRole('fundraiser');
                                }}
                                className={`p-8 rounded-2xl transition-all cursor-pointer ${selectedRole === 'fundraiser'
                                    ? 'bg-[#0077B6] border-2 border-[#00B4D8] scale-105'
                                    : 'bg-[#023E8A] hover:bg-[#0096C7] border-2 border-transparent'}`}
                            >
                                <div className="text-4xl mb-4">🚀</div>
                                <h3 className="text-2xl font-bold mb-2">I Want to Fundraise</h3>
                                <p className="text-[#CAF0F8]">Start your campaign</p>
                            </Button></Link>
                    </div>

                    <PlatformStats />

                </div>
                {/* Add this inside the header section */}
                <div className="my-8 flex justify-center gap-4">
                    <Link href="/donations">
                        <Button className="bg-[#023E8A] hover:bg-[#0077B6] px-6 py-3 rounded-full">
                            🌟 View All Donations
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Features Section */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#03045E] mb-12 text-center">
                        Why Choose OceanFund?
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-[#CAF0F8] p-6 rounded-xl border-2 border-[#48CAE4]">
                            <div className="text-[#0077B6] text-4xl mb-4">🔒</div>
                            <h3 className="text-xl font-bold text-[#03045E] mb-2">Secure Transactions</h3>
                            <p className="text-[#023E8A]">
                                Powered by Google Cloud RPC & Ethereum blockchain
                            </p>
                        </div>

                        <div className="bg-[#CAF0F8] p-6 rounded-xl border-2 border-[#48CAE4]">
                            <div className="text-[#0077B6] text-4xl mb-4">💸</div>
                            <h3 className="text-xl font-bold text-[#03045E] mb-2">PYUSD Stablecoin</h3>
                            <p className="text-[#023E8A]">
                                Donate & receive funds in PayPal's USD-pegged stablecoin
                            </p>
                        </div>

                        <div className="bg-[#CAF0F8] p-6 rounded-xl border-2 border-[#48CAE4]">
                            <div className="text-[#0077B6] text-4xl mb-4">⏱️</div>
                            <h3 className="text-xl font-bold text-[#03045E] mb-2">Instant Settlements</h3>
                            <p className="text-[#023E8A]">
                                Fast transactions with low gas fees
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="bg-[#ADE8F4] py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-[#03045E] mb-12 text-center">
                        How It Works
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-6 rounded-xl bg-[#CAF0F8]">
                            <h3 className="text-2xl font-bold text-[#0077B6] mb-4">For Donors</h3>
                            <ol className="space-y-4 text-[#023E8A]">
                                <li>1. Connect your wallet</li>
                                <li>2. Browse verified campaigns</li>
                                <li>3. Donate PYUSD with one click</li>
                                <li>4. Track your impact</li>
                            </ol>
                        </div>

                        <div className="p-6 rounded-xl bg-[#CAF0F8]">
                            <h3 className="text-2xl font-bold text-[#0077B6] mb-4">For Fundraisers</h3>
                            <ol className="space-y-4 text-[#023E8A]">
                                <li>1. Create your campaign</li>
                                <li>2. Set PYUSD funding goal</li>
                                <li>3. Share with your community</li>
                                <li>4. Withdraw funds securely</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-4 text-center">
                <h2 className="text-3xl font-bold text-[#03045E] mb-8">
                    Ready to Make an Impact?
                </h2>
                <div className="flex justify-center gap-4 flex-wrap">
                    <Link href="/fundraiser">
                        <Button className="bg-[#023E8A] hover:bg-[#0077B6] text-[#CAF0F8] px-8 py-4 rounded-full text-xl font-bold transition-all">
                            Start a Campaign
                        </Button>
                    </Link>
                    <Link href="/donations">
                        <Button className="bg-[#00B4D8] hover:bg-[#0096C7] text-[#023E8A] px-8 py-4 rounded-full text-xl font-bold transition-all">
                            View All Donations
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#03045E] text-[#90E0EF] py-8 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="flex justify-center gap-6 mb-6">
                        <a href="#" className="hover:text-[#48CAE4]">Terms</a>
                        <a href="#" className="hover:text-[#48CAE4]">Privacy</a>
                        <a href="#" className="hover:text-[#48CAE4]">Docs</a>
                    </div>
                    <p className="text-sm">
                        Powered by Google Cloud RPC & PYUSD<br />
                        © 2024 OceanFund. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;