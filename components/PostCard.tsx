"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ThumbsUp,
  MessageSquare,
  Share2,
  Clock,
  Check,
  Video,
  Camera,
} from "lucide-react";
import { PostDTO } from "@/app/actions/getPosts";
import { castVote } from "@/app/actions/vote";
import { getAnonymousPersona } from "@/lib/anonUser";
import { formatTimeAgo, getExpiryRemaining } from "@/lib/utils";
import { AnonUserSession } from "@/hooks/useAnonUser";
import CommentSection from "./CommentSection";

interface PostCardProps {
  post: PostDTO;
  userSession: AnonUserSession;
}

const VOTES_STORAGE_KEY = "superior_conn_votes";

function getStoredVote(postId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return typeof map[postId] === "number" ? map[postId] : 0;
  } catch {
    return 0;
  }
}

function setStoredVote(postId: string, vote: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (vote === 0) {
      delete map[postId];
    } else {
      map[postId] = vote;
    }
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage issues
  }
}

export function PostCard({ post, userSession }: PostCardProps) {
  const [score, setScore] = useState(post.score);
  const [upvotes, setUpvotes] = useState(post.upvotes);
  // Always start at 0 for SSR/hydration match; restore from localStorage after mount
  const [userVote, setUserVote] = useState<number>(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [isCopied, setIsCopied] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // After hydration: restore persisted like state from localStorage (client-only)
  React.useEffect(() => {
    const stored = getStoredVote(post.id);
    if (stored !== 0) {
      setUserVote(stored);
    } else if (post.userVote) {
      setUserVote(post.userVote);
      setStoredVote(post.id, post.userVote);
    }
  }, [post.id, post.userVote]);

  const persona = getAnonymousPersona(post.anonUserId);
  const expiryText = getExpiryRemaining(post.expiresAt);

  const handleLike = async () => {
    if (isVoting) return;
    setIsVoting(true);

    // Optimistic update
    const prevVote = userVote;
    const prevScore = score;
    let nextVote: number;
    let nextScore: number;

    if (prevVote === 1) {
      // Already liked → toggle off (unlike)
      nextVote = 0;
      nextScore = score - 1;
    } else {
      // Not liked yet → like
      nextVote = 1;
      nextScore = score + 1;
    }

    setUserVote(nextVote);
    setScore(nextScore);
    setStoredVote(post.id, nextVote);

    try {
      const res = await castVote({
        targetId: post.id,
        targetType: "post",
        voteType: 1,
        anonUserId: userSession.anonUserId,
      });

      if (res.success) {
        setUserVote(res.userVote);
        setScore(res.newScore);
        setUpvotes(res.newUpvotes);
        setStoredVote(post.id, res.userVote);
      } else {
        // Revert on failure
        setUserVote(prevVote);
        setScore(prevScore);
        setStoredVote(post.id, prevVote);
      }
    } catch {
      // Revert on error
      setUserVote(prevVote);
      setScore(prevScore);
      setStoredVote(post.id, prevVote);
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/#post-${post.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <article
      id={`post-${post.id}`}
      className="bg-card text-card-foreground border border-border hover:border-[#6C1C74]/50 dark:hover:border-[#b54ec4]/50 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200"
    >
      {/* Post Header: Persona, Timestamp & Expiry Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          {/* Persona Avatar Seed Badge */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
            style={{ backgroundColor: persona.badgeColor || "#6C1C74" }}
          >
            {persona.name.charAt(0)}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-foreground hover:text-[#6C1C74] dark:hover:text-[#d880ea] transition">
                {persona.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground font-medium">{persona.tag}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
        </div>

        {/* Right Badges: Video/Photo indicator + Expiry Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {post.mediaType === "video" && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800 text-[#6C1C74] dark:text-[#d880ea] text-[11px] font-extrabold shadow-2xs">
              <Video className="w-3.5 h-3.5" />
              <span>Video</span>
            </div>
          )}

          {post.mediaType === "image" && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
              <Camera className="w-3 h-3" />
              <span>Photo</span>
            </div>
          )}

          {/* Expiry Pill if Post Has Self-Destruct Set */}
          {expiryText && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>{expiryText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h2 className="text-base sm:text-lg font-bold text-foreground mb-2 leading-snug">
          {post.title}
        </h2>
      )}

      {/* Content */}
      <p className="text-sm sm:text-[15px] text-foreground whitespace-pre-wrap leading-relaxed mb-4">
        {post.content}
      </p>

      {/* Media Attachment (Cloudinary Direct Signed Uploads) */}
      {post.mediaUrl && (
        <div className="relative mb-4 rounded-2xl overflow-hidden border border-border/80 bg-black group shadow-xs">
          {post.mediaType === "video" ? (
            <div className="relative w-full bg-black flex flex-col">
              {/* Floating Video Clip Badge Overlay */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-md">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <Video className="w-3.5 h-3.5 text-[#d880ea]" />
                <span>Video Clip</span>
              </div>

              <video
                src={post.mediaUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[460px] object-contain rounded-2xl bg-black"
              />
            </div>
          ) : (
            <div className="relative w-full h-72 sm:h-96">
              <Image
                src={post.mediaUrl}
                alt={post.title || "User post media"}
                fill
                className="object-cover rounded-2xl"
                sizes="(max-width: 768px) 100vw, 700px"
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Bar: Vote Widget, Comment Toggle, Share */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-semibold">
        {/* Like Button */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isVoting}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition active:scale-95 ${
            userVote === 1
              ? "bg-[#6C1C74] dark:bg-[#b54ec4] border-[#6C1C74] dark:border-[#b54ec4] text-white shadow-xs"
              : "bg-muted/60 border-border text-muted-foreground hover:text-[#6C1C74] dark:hover:text-[#d880ea] hover:border-[#6C1C74]/50 dark:hover:border-[#b54ec4]/50 hover:bg-[#6C1C74]/10 dark:hover:bg-[#b54ec4]/15"
          }`}
          title={userVote === 1 ? "Unlike post" : "Like post"}
        >
          <ThumbsUp className={`w-4 h-4 ${userVote === 1 ? "fill-white" : ""}`} />
          <span className="font-bold text-sm">{upvotes}</span>
          <span className="hidden sm:inline text-xs">{userVote === 1 ? "Liked" : "Like"}</span>
        </button>

        {/* Right Action Icons: Comments & Share */}
        <div className="flex items-center gap-2">
          {/* Comment Count & Toggle */}
          <button
            type="button"
            onClick={() => setCommentsOpen(!commentsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition ${
              commentsOpen
                ? "border-[#6C1C74] dark:border-[#b54ec4] bg-[#6C1C74]/15 dark:bg-[#b54ec4]/20 text-[#6C1C74] dark:text-[#d880ea]"
                : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Copy post link"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Nested Comments Section */}
      {commentsOpen && (
        <CommentSection
          postId={post.id}
          userSession={userSession}
          initialCount={commentCount}
        />
      )}
    </article>
  );
}

export default PostCard;
