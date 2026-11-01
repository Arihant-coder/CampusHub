/**
 * @file PrivacyOnboardingModal.tsx
 * @description Non-dismissible first-time modal prompting users to configure their profile privacy.
 * @owner Platform Core Team
 */

import React, { useState } from "react";
import { Shield, Globe, Lock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "../services/authService";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const PrivacyOnboardingModal: React.FC = () => {
  const { user, setAuthUser } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Only display if user is logged in and hasn't completed privacy onboarding
  if (!user || user.privacyOnboardingCompleted) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const isMock = import.meta.env.VITE_USE_MOCKS === "true";
    const res = await authService.updatePrivacySettings(user.id, isPrivate, isMock);
    setIsSaving(false);

    if (res.error) {
      toast.error("Failed to save privacy preference. Please try again.");
      return;
    }

    setAuthUser({
      ...user,
      isPrivate,
      privacyOnboardingCompleted: true,
    });
    toast.success(
      isPrivate
        ? "Profile privacy set to Private."
        : "Profile privacy set to Public."
    );
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Choose Your Profile Privacy
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Welcome to CampusHub! Decide how your profile and activity are seen by peers. You can change this anytime from your profile page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-3">
          <button
            type="button"
            onClick={() => setIsPrivate(false)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              !isPrivate
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <Globe className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">
                Public Profile (Recommended)
              </span>
              <p className="text-xs text-muted-foreground leading-snug">
                Your name, handle, badges, and public community posts are visible to peers on your profile page.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsPrivate(true)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              isPrivate
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <Lock className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">
                Private Profile
              </span>
              <p className="text-xs text-muted-foreground leading-snug">
                Other students see a privacy shield on your profile page; your post history and activity list are hidden.
              </p>
            </div>
          </button>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full font-medium cursor-pointer"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue to CampusHub
        </Button>
      </DialogContent>
    </Dialog>
  );
};

