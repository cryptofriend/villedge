import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileAvatarUploadProps {
  avatarUrl: string | null;
  displayName: string | null;
  isOwnProfile: boolean;
  userId: string;
  onAvatarUpdate: (url: string) => void;
}

export const ProfileAvatarUpload = ({
  avatarUrl,
  displayName,
  isOwnProfile,
  userId,
  onAvatarUpdate,
}: ProfileAvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to spot-images bucket (reusing existing bucket)
      const { error: uploadError } = await supabase.storage
        .from("spot-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("spot-images")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      onAvatarUpdate(data.publicUrl);
      toast.success("Avatar updated!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative group">
      <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-elevated">
        <AvatarImage src={avatarUrl || undefined} alt={displayName || "User"} />
        <AvatarFallback className="bg-primary/10 text-primary text-3xl font-display">
          {(displayName || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {isOwnProfile && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>
        </>
      )}
    </div>
  );
};
