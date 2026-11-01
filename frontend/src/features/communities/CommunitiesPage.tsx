/**
 * @file CommunitiesPage.tsx
 * @description Main view for Communities feature uniting discussion feed and academic resources.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityHeader } from "./components/CommunityHeader";
import { PostFeed } from "./components/PostFeed";
import { ResourceArchive } from "./components/ResourceArchive";
import { communitiesService } from "./services";
import { useDebounce } from "@/lib/use-debounce";
import { toast } from "sonner";
import type { CommunitiesContextType } from "./CommunitiesLayout";
import type {
  Post,
  ResourceNote,
  ResourceType,
  ResourceCategory,
} from "./services/types";

export default function CommunitiesPage() {
  const context = useOutletContext<CommunitiesContextType | undefined>();

  const activeForum = context?.activeForum || null;
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const debouncedSearch = useDebounce(communitySearchQuery, 350);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postSort, setPostSort] = useState<"new" | "top" | "hot">("new");

  const [notes, setNotes] = useState<ResourceNote[]>([]);
  const [pyqs, setPyqs] = useState<ResourceNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingPyqs, setIsLoadingPyqs] = useState(true);

  // Active Main Tab ("posts" | "resources")
  const [activeTab, setActiveTab] = useState<"posts" | "resources">("posts");

  // Reset body search filter when switching subject communities
  useEffect(() => {
    setCommunitySearchQuery("");
  }, [activeForum?.id]);

  // Automatically switch to Posts tab when a search query is typed in the body
  useEffect(() => {
    if (communitySearchQuery.trim()) {
      setActiveTab("posts");
    }
  }, [communitySearchQuery]);

  // 1. Load Posts for active forum (debounced so rapid keystrokes don't flood Supabase)
  const loadPosts = () => {
    if (!activeForum) return;
    setIsLoadingPosts(true);
    communitiesService.getPosts(activeForum.id, postSort, debouncedSearch).then((res) => {
      if (res.data) {
        setPosts(res.data);
      }
      setIsLoadingPosts(false);
    });
  };

  useEffect(() => {
    loadPosts();
  }, [activeForum?.id, postSort, debouncedSearch]);

  // 2. Load Resources for active forum
  const loadResources = () => {
    if (!activeForum) return;
    setIsLoadingNotes(true);
    setIsLoadingPyqs(true);

    communitiesService.getResources(activeForum.id, "Note").then((res) => {
      if (res.data) setNotes(res.data);
      setIsLoadingNotes(false);
    });

    communitiesService.getResources(activeForum.id, "PYQ").then((res) => {
      if (res.data) setPyqs(res.data);
      setIsLoadingPyqs(false);
    });
  };

  useEffect(() => {
    loadResources();
  }, [activeForum?.id]);

  // Optimistic Vote Handler
  const handleVotePost = async (postId: string, newVote: 1 | -1 | null) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;

        let upvotes = post.upvotes;
        let downvotes = post.downvotes;
        const prevVote = post.currentUserVote;

        if (prevVote === 1) upvotes = Math.max(0, upvotes - 1);
        if (prevVote === -1) downvotes = Math.max(0, downvotes - 1);

        if (newVote === 1) upvotes += 1;
        if (newVote === -1) downvotes += 1;

        return {
          ...post,
          upvotes,
          downvotes,
          currentUserVote: newVote,
        };
      })
    );

    const result = await communitiesService.votePost(postId, newVote);
    if (result.error) {
      loadPosts();
    }
  };

  // Upload Resource Handler (Queues note for moderator/admin review)
  const handleUploadResource = async (data: {
    title: string;
    type: ResourceType;
    category?: ResourceCategory;
    pageCount?: number;
    file?: File;
  }) => {
    if (!activeForum) return;
    const res = await communitiesService.uploadResource({
      subjectId: activeForum.id,
      title: data.title,
      type: data.type,
      category: data.category,
      pageCount: data.pageCount,
      file: data.file,
    });
    if (res.data) {
      toast.success(
        "Resource submitted for review! An admin or moderator will verify it before it appears in public notes."
      );
    } else if (res.error) {
      toast.error(res.error.message || "Failed to submit resource for review.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-w-0">
      {activeForum ? (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Forum Header Banner */}
          <CommunityHeader forum={activeForum} />

          {/* Main Tabs: Posts | Resources */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "posts" | "resources")}
            className="w-full"
          >
            <div className="border-b">
              <TabsList className="bg-transparent h-10 p-0 space-x-6">
                <TabsTrigger
                  value="posts"
                  className="relative rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1.5 font-semibold text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
                >
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  value="resources"
                  className="relative rounded-none border-b-2 border-transparent px-2 pb-2.5 pt-1.5 font-semibold text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent inline-flex items-center gap-1.5"
                >
                  <span>Resources</span>
                  {notes.length + pyqs.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                      {notes.length + pyqs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Posts (Discussions) */}
            <TabsContent value="posts" className="mt-4 focus-visible:outline-none">
              <PostFeed
                posts={posts}
                isLoading={isLoadingPosts}
                subjectName={activeForum.name}
                subjectId={activeForum.id}
                sortBy={postSort}
                onSortChange={setPostSort}
                onVote={handleVotePost}
                onRefresh={loadPosts}
                searchQuery={communitySearchQuery}
                onSearchChange={setCommunitySearchQuery}
                onClearSearch={() => setCommunitySearchQuery("")}
              />
            </TabsContent>

            {/* Tab 2: Resources (Notes & PYQs) */}
            <TabsContent value="resources" className="mt-4 focus-visible:outline-none">
              <ResourceArchive
                subjectId={activeForum.id}
                notes={notes}
                pyqs={pyqs}
                isLoadingNotes={isLoadingNotes}
                isLoadingPyqs={isLoadingPyqs}
                subjectName={activeForum.name}
                onUploadResource={handleUploadResource}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Select a subject forum to view discussions and academic resources.
        </div>
      )}
    </div>
  );
}
