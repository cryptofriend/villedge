import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface ProfileVerificationSectionProps {
  isVerified: boolean;
  isOwnProfile: boolean;
}

export const ProfileVerificationSection = ({ isVerified, isOwnProfile }: ProfileVerificationSectionProps) => {
  // Only show verified badge for own profile
  if (!isOwnProfile || !isVerified) return null;
  
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Verified Member</CardTitle>
          <Badge variant="default" className="ml-auto">Verified</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You have full access to all village features.
        </p>
      </CardContent>
    </Card>
  );
};
