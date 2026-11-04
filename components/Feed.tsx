"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Flame,
  Zap,
  Clock,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Sparkles,
  SlidersHorizontal,
  X,
  Ghost,
} from "lucide-react";
import { PostDTO, FeedSortOption, getPosts } from "@/app/actions/getPosts";
import PostCard from "./PostCard";
import { AnonUserSession } from "@/hooks/useAnonUser";

interface FeedProps {
  initialPosts: PostDTO[];
  userSession: AnonUserSession;
  onOpenCreateModal: () => void;
}

const TAG_FILTERS = [
  "All",
  "Campus Life",
  "Exams & Study",
  "Confessions",
  "Professors",
  "Housing",
  "Career",
];

export function Feed({ initialPosts, userSession, onOpenCreateModal }: FeedProps) {
  const [posts, setPosts] = useState<PostDTO[]>(initialPosts);
  const [activeSort, setActiveSort] = useState<FeedSortOption>("trending");
  const [activeTag, setActiveTag] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, startTransition] = useTransition();

  const fetchFeed = (sort = activeSort, search = searchQuery) => {
    startTransition(async () => {
      try {
        const data = await getPosts(sort, userSession.anonUserId, search);
        setPosts(data);
      } catch (err) {
        console.error("Error refreshing feed:", err);
      }
    });
  };

  const handleSortChange = (sort: FeedSortOption) => {
    setActiveSort(sort);
    fetchFeed(sort, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeed(activeSort, searchQuery);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    if (tag === "All") {
      setSearchQuery("");
      fetchFeed(activeSort, "");
    } else {
      setSearchQuery(tag);
      fetchFeed(activeSort, tag);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Quick Creator Box */}
      <div
        onClick={onOpenCreateModal}
        className="bg-card border border-border hover:border-[#6C1C74]/50 rounded-2xl p-3.5 sm:p-4 shadow-xs transition cursor-pointer group flex items-center gap-3"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs group-hover:scale-105 transition"
          style={{ backgroundColor: userSession.badgeColor || "#6C1C74" }}
        >
          {userSession.name ? userSession.name.charAt(0) : "A"}
        </div>
        <div className="flex-1 bg-muted/40 hover:bg-muted/70 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-muted-foreground transition border border-border">
          What is happening anonymously on campus today?
        </div>
        <button
          type="button"
          className="hidden sm:flex items-center gap-1.5 bg-[#6C1C74] group-hover:bg-[#58165E] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post</span>
        </button>
      </div>

      {/* Sorting Tabs & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Sorting Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => handleSortChange("trending")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeSort === "trending"
                  ? "bg-[#6C1C74] dark:bg-[#b54ec4] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Trending</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange("top")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeSort === "top"
                  ? "bg-[#6C1C74] dark:bg-[#b54ec4] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Top</span>
            </button>

            <button
              type="button"
              onClick={() => handleSortChange("recent")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeSort === "recent"
                  ? "bg-[#6C1C74] dark:bg-[#b54ec4] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Recent</span>
            </button>
          </div>

          {/* Search Input & Refresh */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-56">
              <input
                type="text"
                placeholder="Search campus feed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-input bg-background text-xs focus:ring-1 focus:ring-[#6C1C74] focus:outline-hidden transition"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    fetchFeed(activeSort, "");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={() => fetchFeed()}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-[#6C1C74] transition"
              title="Refresh feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#6C1C74]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {TAG_FILTERS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap text-xs font-medium ${
                activeTag === tag
                  ? "border-[#6C1C74] dark:border-[#b54ec4] bg-[#6C1C74]/15 dark:bg-[#b54ec4]/25 text-[#6C1C74] dark:text-[#d880ea] font-bold"
                  : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Post Stream */}
      {isRefreshing ? (
        <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#6C1C74]" />
          <span>Updating anonymous campus stream...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#6C1C74]/10 text-[#6C1C74] flex items-center justify-center mx-auto">
            <Ghost className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">No posts found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Be the first student to publish news, questions, or campus confessions completely anonymously!
          </p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 bg-[#6C1C74] hover:bg-[#58165E] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} userSession={userSession} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Feed;
