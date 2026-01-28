import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Mail, Fingerprint, Wallet, Globe, Crown, 
  BarChart3, Building2 
} from "lucide-react";

interface RegistrationStats {
  total: number;
  byMethod: {
    privy: number;
    porto: number;
    ethereum: number;
    solana: number;
    ton: number;
  };
}

interface VillageWithHost {
  id: string;
  name: string;
  logo_url: string | null;
  created_by: string | null;
  host_username: string | null;
  host_avatar: string | null;
  host_display_name: string | null;
  resident_count: number;
}

export function AdminAnalytics() {
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats>({
    total: 0,
    byMethod: { privy: 0, porto: 0, ethereum: 0, solana: 0, ton: 0 }
  });
  const [villagesWithHosts, setVillagesWithHosts] = useState<VillageWithHost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch all profiles
        const { data: profiles, count: profileCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact" });

        // Analyze registration methods from user_wallets
        const { data: wallets } = await supabase
          .from("user_wallets")
          .select("user_id, wallet_type");

        // Count unique users by their primary wallet type
        const userWalletTypes = new Map<string, string>();
        wallets?.forEach(w => {
          // If user already has a type, prioritize porto > ethereum > solana > ton
          const priority = { porto: 4, ethereum: 3, solana: 2, ton: 1 };
          const currentType = userWalletTypes.get(w.user_id);
          if (!currentType || (priority[w.wallet_type as keyof typeof priority] || 0) > (priority[currentType as keyof typeof priority] || 0)) {
            userWalletTypes.set(w.user_id, w.wallet_type);
          }
        });

        // Count by method
        const byMethod = { privy: 0, porto: 0, ethereum: 0, solana: 0, ton: 0 };
        
        // Users with wallets
        userWalletTypes.forEach((type) => {
          if (type in byMethod) {
            byMethod[type as keyof typeof byMethod]++;
          }
        });

        // Users without wallets are likely privy (email) users
        const usersWithWallets = new Set(wallets?.map(w => w.user_id) || []);
        const privyUsers = profiles?.filter(p => !usersWithWallets.has(p.user_id)) || [];
        byMethod.privy = privyUsers.length;

        setRegistrationStats({
          total: profileCount || 0,
          byMethod
        });

        // Fetch villages with hosts and resident counts
        const { data: villages } = await supabase
          .from("villages")
          .select("id, name, logo_url, created_by")
          .order("created_at", { ascending: false });

        if (villages) {
          // Fetch host profiles
          const hostIds = villages.map(v => v.created_by).filter(Boolean) as string[];
          const { data: hostProfiles } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url, display_name")
            .in("user_id", hostIds);

          const hostMap = new Map(hostProfiles?.map(p => [p.user_id, p]) || []);

          // Fetch resident counts per village
          const { data: stays } = await supabase
            .from("stays")
            .select("village_id");

          const residentCounts = new Map<string, number>();
          stays?.forEach(s => {
            residentCounts.set(s.village_id, (residentCounts.get(s.village_id) || 0) + 1);
          });

          const villagesData: VillageWithHost[] = villages.map(v => {
            const host = v.created_by ? hostMap.get(v.created_by) : null;
            return {
              id: v.id,
              name: v.name,
              logo_url: v.logo_url,
              created_by: v.created_by,
              host_username: host?.username || null,
              host_avatar: host?.avatar_url || null,
              host_display_name: host?.display_name || null,
              resident_count: residentCounts.get(v.id) || 0,
            };
          });

          setVillagesWithHosts(villagesData);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  const methodIcons = {
    privy: { icon: Mail, label: "Email (Privy)", color: "text-blue-500", bg: "bg-blue-500/10" },
    porto: { icon: Fingerprint, label: "Biometric (Porto)", color: "text-purple-500", bg: "bg-purple-500/10" },
    ethereum: { icon: Wallet, label: "Ethereum", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    solana: { icon: Wallet, label: "Solana", color: "text-green-500", bg: "bg-green-500/10" },
    ton: { icon: Globe, label: "TON/Telegram", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  };

  return (
    <div className="space-y-6">
      {/* Registration Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              User Registration Analytics
            </CardTitle>
            <Badge variant="secondary">{registrationStats.total} total users</Badge>
          </div>
          <CardDescription>
            Breakdown of user registration methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(registrationStats.byMethod).map(([method, count]) => {
              const config = methodIcons[method as keyof typeof methodIcons];
              const Icon = config.icon;
              const percentage = registrationStats.total > 0 
                ? Math.round((count / registrationStats.total) * 100) 
                : 0;
              
              return (
                <div 
                  key={method}
                  className="flex flex-col items-center p-4 rounded-lg border bg-card"
                >
                  <div className={`p-3 rounded-full ${config.bg} mb-2`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground text-center">{config.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Villages with Hosts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Villages & Hosts
            </CardTitle>
            <Badge variant="secondary">{villagesWithHosts.length} villages</Badge>
          </div>
          <CardDescription>
            Village ownership and resident statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {villagesWithHosts.map((village) => (
              <div 
                key={village.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Village Logo */}
                <div className="shrink-0">
                  {village.logo_url ? (
                    <img 
                      src={village.logo_url} 
                      alt={village.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Village Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{village.name}</p>
                  <p className="text-xs text-muted-foreground">/{village.id}</p>
                </div>

                {/* Host Info */}
                <div className="flex items-center gap-2 shrink-0">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {village.host_username ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={village.host_avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {(village.host_display_name || village.host_username)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">@{village.host_username}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No host</span>
                  )}
                </div>

                {/* Resident Count */}
                <div className="flex items-center gap-2 shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono">
                    {village.resident_count}
                  </Badge>
                </div>
              </div>
            ))}

            {villagesWithHosts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No villages found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
