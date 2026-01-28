import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Mail, Fingerprint, Wallet, Globe, Crown, 
  BarChart3, Building2, Pencil, Trash2, Plus, UserPlus, X
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

interface HostInfo {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  role: 'owner' | 'co-host';
}

interface VillageWithHosts {
  id: string;
  name: string;
  logo_url: string | null;
  created_by: string | null;
  hosts: HostInfo[];
  resident_count: number;
}

export function AdminAnalytics() {
  const [registrationStats, setRegistrationStats] = useState<RegistrationStats>({
    total: 0,
    byMethod: { privy: 0, porto: 0, ethereum: 0, solana: 0, ton: 0 }
  });
  const [villagesWithHosts, setVillagesWithHosts] = useState<VillageWithHosts[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit hosts dialog state
  const [editingVillage, setEditingVillage] = useState<VillageWithHosts | null>(null);
  const [newCoHostUsername, setNewCoHostUsername] = useState("");
  const [newOwnerUsername, setNewOwnerUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const priority = { porto: 4, ethereum: 3, solana: 2, ton: 1 };
        const currentType = userWalletTypes.get(w.user_id);
        if (!currentType || (priority[w.wallet_type as keyof typeof priority] || 0) > (priority[currentType as keyof typeof priority] || 0)) {
          userWalletTypes.set(w.user_id, w.wallet_type);
        }
      });

      // Count by method
      const byMethod = { privy: 0, porto: 0, ethereum: 0, solana: 0, ton: 0 };
      
      userWalletTypes.forEach((type) => {
        if (type in byMethod) {
          byMethod[type as keyof typeof byMethod]++;
        }
      });

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
        const { data: villageHosts } = await supabase
          .from("village_hosts")
          .select("village_id, user_id, role");

        const ownerIds = villages.map(v => v.created_by).filter(Boolean) as string[];
        const coHostIds = villageHosts?.map(h => h.user_id) || [];
        const allHostIds = [...new Set([...ownerIds, ...coHostIds])];

        const { data: hostProfiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", allHostIds);

        const profileMap = new Map(hostProfiles?.map(p => [p.user_id, p]) || []);

        const { data: stays } = await supabase
          .from("stays")
          .select("village_id");

        const residentCounts = new Map<string, number>();
        stays?.forEach(s => {
          residentCounts.set(s.village_id, (residentCounts.get(s.village_id) || 0) + 1);
        });

        const villagesData: VillageWithHosts[] = villages.map(v => {
          const hosts: HostInfo[] = [];
          
          if (v.created_by) {
            const ownerProfile = profileMap.get(v.created_by);
            hosts.push({
              user_id: v.created_by,
              username: ownerProfile?.username || null,
              avatar_url: ownerProfile?.avatar_url || null,
              role: 'owner'
            });
          }

          const coHosts = villageHosts?.filter(h => h.village_id === v.id) || [];
          coHosts.forEach(h => {
            if (h.user_id === v.created_by) return;
            const profile = profileMap.get(h.user_id);
            hosts.push({
              user_id: h.user_id,
              username: profile?.username || null,
              avatar_url: profile?.avatar_url || null,
              role: h.role as 'owner' | 'co-host'
            });
          });

          return {
            id: v.id,
            name: v.name,
            logo_url: v.logo_url,
            created_by: v.created_by,
            hosts,
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Find user by username
  const findUserByUsername = async (username: string) => {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .ilike("username", cleanUsername)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  };

  // Add co-host
  const handleAddCoHost = async () => {
    if (!editingVillage || !newCoHostUsername.trim()) return;
    
    setIsSubmitting(true);
    try {
      const user = await findUserByUsername(newCoHostUsername);
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Check if already a host
      if (editingVillage.hosts.some(h => h.user_id === user.user_id)) {
        toast.error("User is already a host");
        return;
      }

      const { error } = await supabase
        .from("village_hosts")
        .insert({
          village_id: editingVillage.id,
          user_id: user.user_id,
          role: "co-host"
        });

      if (error) throw error;

      toast.success(`Added @${user.username} as co-host`);
      setNewCoHostUsername("");
      await fetchAnalytics();
      
      // Update editing village state
      const updated = villagesWithHosts.find(v => v.id === editingVillage.id);
      if (updated) setEditingVillage(updated);
    } catch (error) {
      console.error("Error adding co-host:", error);
      toast.error("Failed to add co-host");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove co-host
  const handleRemoveCoHost = async (userId: string) => {
    if (!editingVillage) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("village_hosts")
        .delete()
        .eq("village_id", editingVillage.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Removed co-host");
      await fetchAnalytics();
      
      const updated = villagesWithHosts.find(v => v.id === editingVillage.id);
      if (updated) setEditingVillage(updated);
    } catch (error) {
      console.error("Error removing co-host:", error);
      toast.error("Failed to remove co-host");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change owner
  const handleChangeOwner = async () => {
    if (!editingVillage || !newOwnerUsername.trim()) return;
    
    setIsSubmitting(true);
    try {
      const user = await findUserByUsername(newOwnerUsername);
      if (!user) {
        toast.error("User not found");
        return;
      }

      const { error } = await supabase
        .from("villages")
        .update({ created_by: user.user_id })
        .eq("id", editingVillage.id);

      if (error) throw error;

      toast.success(`Changed owner to @${user.username}`);
      setNewOwnerUsername("");
      await fetchAnalytics();
      
      const updated = villagesWithHosts.find(v => v.id === editingVillage.id);
      if (updated) setEditingVillage(updated);
    } catch (error) {
      console.error("Error changing owner:", error);
      toast.error("Failed to change owner");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh editing village data when villagesWithHosts updates
  useEffect(() => {
    if (editingVillage) {
      const updated = villagesWithHosts.find(v => v.id === editingVillage.id);
      if (updated) setEditingVillage(updated);
    }
  }, [villagesWithHosts]);

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
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {village.hosts.length > 0 ? (
                    village.hosts.map((host, idx) => (
                      <div key={host.user_id} className="flex items-center gap-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={host.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {host.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          @{host.username || 'unknown'}
                          {host.role === 'owner' && <span className="text-amber-500 ml-0.5">★</span>}
                        </span>
                        {idx < village.hosts.length - 1 && <span className="text-muted-foreground">,</span>}
                      </div>
                    ))
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

                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setEditingVillage(village)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
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

      {/* Edit Hosts Dialog */}
      <Dialog open={!!editingVillage} onOpenChange={(open) => !open && setEditingVillage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingVillage?.logo_url && (
                <img src={editingVillage.logo_url} alt="" className="h-6 w-6 rounded" />
              )}
              Edit Hosts: {editingVillage?.name}
            </DialogTitle>
            <DialogDescription>
              Manage owner and co-hosts for this village
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Current Owner */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Owner
              </Label>
              {editingVillage?.hosts.find(h => h.role === 'owner') ? (
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={editingVillage.hosts.find(h => h.role === 'owner')?.avatar_url || undefined} />
                    <AvatarFallback>
                      {editingVillage.hosts.find(h => h.role === 'owner')?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    @{editingVillage.hosts.find(h => h.role === 'owner')?.username || 'unknown'}
                  </span>
                  <Badge variant="secondary" className="ml-auto">Owner</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No owner assigned</p>
              )}
              
              {/* Change Owner */}
              <div className="flex gap-2">
                <Input
                  placeholder="@username"
                  value={newOwnerUsername}
                  onChange={(e) => setNewOwnerUsername(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleChangeOwner} 
                  disabled={!newOwnerUsername.trim() || isSubmitting}
                  size="sm"
                >
                  Change
                </Button>
              </div>
            </div>

            {/* Co-hosts */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Co-hosts
              </Label>
              
              {editingVillage?.hosts.filter(h => h.role === 'co-host').map(host => (
                <div key={host.user_id} className="flex items-center gap-2 p-2 rounded-lg border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={host.avatar_url || undefined} />
                    <AvatarFallback>
                      {host.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">@{host.username || 'unknown'}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCoHost(host.user_id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {editingVillage?.hosts.filter(h => h.role === 'co-host').length === 0 && (
                <p className="text-sm text-muted-foreground">No co-hosts yet</p>
              )}

              {/* Add Co-host */}
              <div className="flex gap-2">
                <Input
                  placeholder="@username"
                  value={newCoHostUsername}
                  onChange={(e) => setNewCoHostUsername(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddCoHost} 
                  disabled={!newCoHostUsername.trim() || isSubmitting}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
