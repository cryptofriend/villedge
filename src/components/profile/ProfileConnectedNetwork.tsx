import { useEffect, useState } from "react";
import { Network, Users, Link2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useMutualConnections } from "@/hooks/useMutualConnections";

interface Village {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ProfileConnectedNetworkProps {
  userId: string;
}

export const ProfileConnectedNetwork = ({ userId }: ProfileConnectedNetworkProps) => {
  const navigate = useNavigate();
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const { connections: mutualConnections, connectionsCount, loading: connectionsLoading } = useMutualConnections(userId);

  useEffect(() => {
    const fetchConnectedVillages = async () => {
      if (!userId) return;

      try {
        // Get villages from stays
        const { data: stays } = await supabase
          .from("stays")
          .select("village_id")
          .eq("user_id", userId);

        // Get villages created by user
        const { data: createdVillages } = await supabase
          .from("villages")
          .select("id, name, logo_url")
          .eq("created_by", userId);

        const villageIds = new Set<string>();
        
        stays?.forEach((s) => villageIds.add(s.village_id));
        createdVillages?.forEach((v) => villageIds.add(v.id));

        if (villageIds.size > 0) {
          const { data: villageData } = await supabase
            .from("villages")
            .select("id, name, logo_url")
            .in("id", Array.from(villageIds));

          setVillages(villageData || []);
        }
      } catch (error) {
        console.error("Error fetching villages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedVillages();
  }, [userId]);

  const isLoading = loading || connectionsLoading;

  if (isLoading) {
    return null;
  }

  // Show section if there are villages or mutual connections
  if (villages.length === 0 && mutualConnections.length === 0) {
    return null;
  }

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-semibold text-foreground">Connected Network</h2>
      </div>

      <div className="space-y-6">
      {/* Connections - Social Graph */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Connections
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{mutualConnections.length}</span> connections</span>
            </div>
          </div>
          
          {mutualConnections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mutualConnections.map((connection) => (
                <button
                  key={connection.user_id}
                  onClick={() => navigate(`/profile/${connection.username || connection.user_id}`)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={connection.avatar_url || undefined} alt={connection.username || ''} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(connection.username || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    @{connection.username || 'user'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No connections yet
            </p>
          )}
        </div>

        {/* Villages */}
        {villages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Villages
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {villages.map((village) => (
                <button
                  key={village.id}
                  onClick={() => navigate(`/${village.id}`)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={village.logo_url || undefined} alt={village.name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {village.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{village.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

