import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@radix-ui/themes";

interface CampaignTabsProps {
  activeCount: number;
  endedCount: number;
}

const CampaignTabs = ({ activeCount, endedCount }: CampaignTabsProps) => {
  const [activeTab, setActiveTab] = useState<"active" | "ended">("ended");

  return (
    <div className="flex justify-center mb-8">
      <div className="bg-white p-1 rounded-full shadow-sm">
        <Link href="/campaigns/active">
          <Button
            variant="soft"
            className={`rounded-full px-6 py-2 ${
              activeTab === "active"
                ? "bg-[#0077B6] text-white"
                : "text-[#0077B6] hover:bg-[#CAF0F8]"
            }`}
            onClick={() => setActiveTab("active")}
          >
            Active ({activeCount})
          </Button>
        </Link>
        <Link href="/campaigns/ended">
          <Button
            variant="soft"
            className={`rounded-full px-6 py-2 ml-2 ${
              activeTab === "ended"
                ? "bg-[#0077B6] text-white"
                : "text-[#0077B6] hover:bg-[#CAF0F8]"
            }`}
            onClick={() => setActiveTab("ended")}
          >
            Ended ({endedCount})
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CampaignTabs;