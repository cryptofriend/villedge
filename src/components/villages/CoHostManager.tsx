import { useState, useEffect } from "react";
import { Users, UserPlus, X, Loader2, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useVillageHosts, VillageHost } from "@/hooks/useVillageHosts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CoHostManagerProps {
  villageId: string;
  villageOwnerId?: string;
}

interface ProfileSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const CoHostManager = ({ villageId, villageOwnerId }: CoHostManagerProps) => {
  const { user } = useAuth();
  const { hosts, loading, addCoHost, removeCoHost } = useVillageHosts(villageId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isOwner = user?.id === villageOwnerId;

  // Search for users by display name
  useEffect(() => {
    const searchProfiles = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .ilike('display_name', `%${searchQuery}%`)
          .limit(5);

        if (error) throw error;

        // Filter out users who are already hosts
        const hostUserIds = hosts.map(h => h.user_id);
        const filtered = (data || []).filter(
          p => !hostUserIds.includes(p.user_id)
        );

        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProfiles, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, hosts]);

  const handleAddCoHost = async (profile: ProfileSearchResult) => {
    setIsAdding(true);
    try {
      const { error } = await addCoHost(profile.user_id);
      if (error) throw error;
      toast.success(`${profile.display_name || 'User'} added as co-host`);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      console.error('Error adding co-host:', err);
      toast.error(err.message || "Failed to add co-host");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCoHost = async (host: VillageHost) => {
    if (host.role === 'owner') {
      toast.error("Cannot remove the village owner");
      return;
    }

    try {
      const { error } = await removeCoHost(host.id);
      if (error) throw error;
      toast.success(`${host.profile?.display_name || 'User'} removed as co-host`);
    } catch (err: any) {
      console.error('Error removing co-host:', err);
      toast.error("Failed to remove co-host");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">Village Hosts</h4>
        <Badge variant="secondary" className="text-xs">
          {hosts.length}
        </Badge>
      </div>

      {/* Current hosts list */}
      <div className="space-y-2">
        {hosts.map((host) => (
          <div
            key={host.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={host.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(host.profile?.display_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {host.profile?.display_name || "Unknown User"}
                </p>
                <div className="flex items-center gap-1">
                  {host.role === 'owner' ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1 bg-amber-500 hover:bg-amber-500">
                      <Crown className="h-2.5 w-2.5" />
                      Owner
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      Co-host
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Only owners can remove co-hosts, and can't remove themselves */}
            {isOwner && host.role !== 'owner' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveCoHost(host)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add co-host section - only for owners */}
      {isOwner && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="cohost-search" className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserPlus className="h-3 w-3" />
            Add Co-host
          </Label>
          <div className="relative">
            <Input
              id="cohost-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by display name..."
              className="pr-8"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg bg-popover shadow-lg overflow-hidden">
              {searchResults.map((profile) => (
                <button
                  key={profile.user_id}
                  onClick={() => handleAddCoHost(profile)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(profile.display_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{profile.display_name || "Unknown"}</span>
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : (
                    <UserPlus className="h-4 w-4 ml-auto text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No users found
            </p>
          )}
        </div>
      )}
    </div>
  );
};
