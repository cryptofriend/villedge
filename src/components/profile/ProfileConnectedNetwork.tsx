import { useEffect, useState } from "react";
import { Network, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

  if (loading) {
    return null;
  }

  if (villages.length === 0) {
    return null;
  }

  return (
    <section className="py-8 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-semibold text-foreground">Connected Network</h2>
      </div>

      {/* Villages */}
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Villages
          </p>
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

        {/* Collaborators placeholder */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
            Frequent Collaborators
          </p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <Avatar key={i} className="h-8 w-8 ring-2 ring-background">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    ?
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground italic ml-2">
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
