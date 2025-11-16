"use client";

import { useEffect } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import TreasuryManagement from "@/components/TreasuryManagement";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { currentAccount } = useWalletKit();
  const router = useRouter();
  const ownerAddress = process.env.NEXT_PUBLIC_OWNER_ADDRESS;

  const isOwner =
    !!currentAccount?.address &&
    !!ownerAddress &&
    currentAccount.address.toLowerCase() === ownerAddress.toLowerCase();

  // Redirect non-owners after checking
  useEffect(() => {
    if (currentAccount && !isOwner) {
      // Only redirect if wallet is connected but user is not owner
      console.log("Access denied: User is not treasury owner");
    }
  }, [currentAccount, isOwner]);

  // Show wallet connection prompt if not connected
  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Treasury management and platform administration
                </p>
              </div>
            </div>

            <Card className="border-yellow-500/50">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Wallet Not Connected
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Please connect your wallet to access the admin dashboard
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Note: Only the treasury owner wallet can access this page
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not owner
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Treasury management and platform administration
                </p>
              </div>
            </div>

            <Card className="border-red-500/50">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                  <p className="text-muted-foreground mb-4">
                    Only the treasury owner can access this dashboard
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium">Your address:</span>
                      <br />
                      <code className="text-xs">{currentAccount.address}</code>
                    </p>
                    <p>
                      <span className="font-medium">Owner address:</span>
                      <br />
                      <code className="text-xs">{ownerAddress}</code>
                    </p>
                  </div>
                  <Button
                    className="mt-6"
                    onClick={() => router.push("/")}
                    variant="outline"
                  >
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show admin dashboard for owner
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Treasury management and platform administration
              </p>
            </div>
          </div>

          {/* Welcome Card */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-info/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Welcome, Treasury Owner</p>
                  <p className="text-sm text-muted-foreground">
                    You have full access to treasury management
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Treasury Management Component */}
          <TreasuryManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
