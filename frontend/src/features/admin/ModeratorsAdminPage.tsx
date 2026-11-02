/**
 * @file ModeratorsAdminPage.tsx
 * @description Admin portal for managing per-community moderators.
 *              Allows global admins to select subjects, view assigned moderators,
 *              search users by handle, assign new moderators, and remove existing ones.
 * @owner Platform Admin Team
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Search,
  Loader2,
  Calendar,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { adminService } from "./services";
import type {
  AdminSubject,
  CommunityModerator,
  ProfileSearchResult,
} from "./services/types";

export const ModeratorsAdminPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [moderators, setModerators] = useState<CommunityModerator[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingModerators, setIsLoadingModerators] = useState(false);

  // Search profiles state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [modToRemove, setModToRemove] = useState<CommunityModerator | null>(null);

  // 1. Load subjects catalogue
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSubjects(true);
    adminService.getSubjects().then((res) => {
      if (!isMounted) return;
      if (res.data && res.data.length > 0) {
        setSubjects(res.data);
        setSelectedSubjectId(res.data[0].id);
      }
      setIsLoadingSubjects(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load moderators for selected subject
  const loadModerators = useCallback(async (subjectId: string) => {
    if (!subjectId) return;
    try {
      setIsLoadingModerators(true);
      const res = await adminService.getCommunityModerators(subjectId);
      if (res.data) {
        setModerators(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load moderators.");
    } finally {
      setIsLoadingModerators(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      loadModerators(selectedSubjectId);
    }
  }, [selectedSubjectId, loadModerators]);

  // 3. Search profiles for assignment
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await adminService.searchProfiles(trimmed);
        if (res.data) {
          setSearchResults(res.data);
        }
      } catch (err: any) {
        console.error("Profile search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Assign moderator
  const handleAssignModerator = async (profile: ProfileSearchResult) => {
    if (!selectedSubjectId) return;

    // Check if already assigned
    if (moderators.some((m) => m.userId === profile.id)) {
      toast.info(`${profile.fullName || "User"} is already a moderator of this community.`);
      return;
    }

    try {
      setIsAssigning(profile.id);
      const res = await adminService.assignModerator(selectedSubjectId, profile.id);
      if (res.error) {
        toast.error(res.error.message || "Failed to assign moderator.");
        return;
      }

      toast.success(`Assigned ${profile.fullName || "User"} as moderator.`);
      setSearchQuery("");
      setSearchResults([]);

      // Reload list
      await loadModerators(selectedSubjectId);

      // If target is current user, refresh active profile
      if (user?.id === profile.id) {
        await refreshProfile();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while assigning moderator.");
    } finally {
      setIsAssigning(null);
    }
  };

  // 5. Remove moderator
  const handleRemoveModerator = (mod: CommunityModerator) => {
    setModToRemove(mod);
  };

  const handleConfirmRemoveModerator = async () => {
    if (!selectedSubjectId || !modToRemove) return;

    try {
      setIsRemoving(modToRemove.userId);
      const res = await adminService.removeModerator(selectedSubjectId, modToRemove.userId);
      if (res.error) {
        toast.error(res.error.message || "Failed to remove moderator.");
        return;
      }

      toast.success(`Revoked moderation privileges for ${modToRemove.fullName || "moderator"}.`);
      await loadModerators(selectedSubjectId);

      // If target is current user, refresh active profile
      if (user?.id === modToRemove.userId) {
        await refreshProfile();
      }
      setModToRemove(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while removing moderator.");
    } finally {
      setIsRemoving(null);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span>Community Moderator Management</span>
            <Badge variant="destructive" className="text-xs uppercase">
              Admin Only
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure per-community moderators. Moderators have moderation authority scoped strictly
            to assigned subjects; administrators maintain global oversight across all subjects.
          </p>
        </div>
      </div>

      {/* Subject Selector Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Community
            </span>
            <p className="text-sm text-foreground font-medium">
              Choose the academic subject to inspect and manage its designated moderators:
            </p>
          </div>

          <div className="w-full sm:w-[320px]">
            {isLoadingSubjects ? (
              <div className="h-9 w-full bg-muted animate-pulse rounded-md" />
            ) : (
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-9 text-sm font-medium">
                  <SelectValue placeholder="Select a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.code} • {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Current Moderators + Add New Moderator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Current Moderators List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Active Moderators</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {selectedSubject
                      ? `${selectedSubject.name} (${selectedSubject.code})`
                      : "Selected Subject"}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {moderators.length} {moderators.length === 1 ? "Moderator" : "Moderators"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y">
              {isLoadingModerators ? (
                <div className="flex items-center justify-center p-8 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Loading community moderators...</span>
                </div>
              ) : moderators.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">No Moderators Assigned</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This subject currently has no assigned moderators. Global administrators will
                    moderate this community until local moderators are designated.
                  </p>
                </div>
              ) : (
                moderators.map((mod) => (
                  <div
                    key={mod.userId}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        {mod.avatarUrl && <AvatarImage src={mod.avatarUrl} alt={mod.fullName || "Moderator"} />}
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {(mod.fullName || "M").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {mod.fullName || "Moderator"}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/40 text-primary">
                            Moderator
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="h-3 w-3" />
                            Since {new Date(mod.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemoving === mod.userId}
                      onClick={() => handleRemoveModerator(mod)}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 cursor-pointer shrink-0"
                      title="Revoke moderation privileges"
                    >
                      {isRemoving === mod.userId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Remove</span>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Add Moderator Search Box */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span>Assign Moderator</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Search students by name to designate them as a moderator for{" "}
                <span className="font-semibold text-foreground">{selectedSubject?.code || "this subject"}</span>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Search input (never displays email) */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results Dropdown / List */}
              {searchQuery.trim().length >= 2 && (
                <div className="rounded-lg border bg-card/60 divide-y max-h-60 overflow-y-auto">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No users found matching "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((profile) => {
                      const isAlreadyMod = moderators.some((m) => m.userId === profile.id);
                      return (
                        <div
                          key={profile.id}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 leading-tight">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {profile.fullName || "Student"}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            disabled={isAlreadyMod || isAssigning === profile.id}
                            onClick={() => handleAssignModerator(profile)}
                            className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                            variant={isAlreadyMod ? "secondary" : "default"}
                          >
                            {isAssigning === profile.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3" />
                            )}
                            <span>{isAlreadyMod ? "Assigned" : "Assign"}</span>
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Security & Auditing Note</span>
                </div>
                <p>
                  Every moderator assignment and removal is recorded with an immutable audit entry in{" "}
                  <code className="text-[10px] font-mono bg-muted px-1 rounded">public.moderation_log</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(modToRemove)}
        onOpenChange={(open) => !open && setModToRemove(null)}
        title="Revoke Moderation Privileges"
        description={
          modToRemove ? (
            <>
              Are you sure you want to revoke moderation privileges for{" "}
              <span className="font-semibold text-foreground">
                {modToRemove.fullName || `@${modToRemove.handle}` || "this moderator"}
              </span>{" "}
              in this community?
            </>
          ) : undefined
        }
        confirmText="Revoke Privileges"
        variant="destructive"
        isLoading={Boolean(isRemoving)}
        onConfirm={handleConfirmRemoveModerator}
      />
    </div>
  );
};

export default ModeratorsAdminPage;

