/**
 * @file PrivacyOnboardingModal.tsx
 * @description First-time modal prompting newly registered users to configure their profile privacy.
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "../services/authService";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const PrivacyOnboardingModal: React.FC = () => {
  const { user, setAuthUser } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Only display if user is logged in, hasn't completed privacy onboarding, AND just registered in this session
  const isJustRegistered =
    typeof window !== "undefined" &&
    sessionStorage.getItem("campushub:just_registered") === "true";

  if (!user || user.privacyOnboardingCompleted || !isJustRegistered || !isOpen) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    const isMock = import.meta.env.VITE_USE_MOCKS === "true";
    sessionStorage.removeItem("campushub:just_registered");
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
    setIsOpen(false);
    toast.success(
      isPrivate
        ? "Profile privacy set to Private."
        : "Profile privacy set to Public."
    );
  };

  const handleDismiss = async () => {
    sessionStorage.removeItem("campushub:just_registered");
    setIsOpen(false);
    const isMock = import.meta.env.VITE_USE_MOCKS === "true";
    // Default to public if dismissed without explicit selection
    await authService.updatePrivacySettings(user.id, false, isMock);
    setAuthUser({
      ...user,
      isPrivate: false,
      privacyOnboardingCompleted: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
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
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Public Profile (Recommended)
                </span>
                {!isPrivate && (
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
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
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Private Profile
                </span>
                {isPrivate && (
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Other students see a privacy shield on your profile page; your post history and activity list are hidden.
              </p>
            </div>
          </button>
        </div>

        <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            disabled={isSaving}
            className="w-full sm:w-auto cursor-pointer"
          >
            Dismiss
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto font-medium cursor-pointer"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to CampusHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
