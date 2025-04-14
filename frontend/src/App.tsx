import './App.css';
import FundraisingPlatform from './pages/FundraisingPlatform';
import LandingPage from './pages/LandingPage';
import DonorPage from "./pages/DonorPage";
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from './configs/queryClient';
import { WalletProvider } from './configs/web3';
import NotFound from './pages/NotFound';
import { Toaster } from './ui/Toaster';
import DonationsHistoryPage from './pages/DonationHistoryPage';
import CampaignPage from './pages/CampaignPage';


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <main className="flex-grow">
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/donor" component={DonorPage} />
              <Route path="/campaigns/active" component={DonorPage} />
              <Route path="/campaigns/ended" component={DonorPage} />
              <Route path="/fundraiser" component={FundraisingPlatform} />
              <Route path="/donations" component={DonationsHistoryPage} />
              <Route path="/campaign/:id" component={CampaignPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        <Toaster />
      </WalletProvider>
    </QueryClientProvider>
  );
}
export default App;