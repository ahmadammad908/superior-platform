"use client";

import React, { useState, useTransition } from "react";
import {
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  Reply,
  Send,
  Loader2,
  ShieldAlert,
  Ghost,
} from "lucide-react";
import { CommentDTO, getComments } from "@/app/actions/getComments";
import { createComment } from "@/app/actions/createComment";
import { castVote } from "@/app/actions/vote";
import { getAnonymousPersona } from "@/lib/anonUser";
import { formatTimeAgo } from "@/lib/utils";
import { AnonUserSession } from "@/hooks/useAnonUser";

interface CommentSectionProps {
  postId: string;
  userSession: AnonUserSession;
  initialCount: number;
}

const COMMENT_VOTES_STORAGE_KEY = "superior_conn_comment_votes";

function getStoredCommentVote(commentId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(COMMENT_VOTES_STORAGE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return typeof map[commentId] === "number" ? map[commentId] : 0;
  } catch {
    return 0;
  }
}

function setStoredCommentVote(commentId: string, vote: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COMMENT_VOTES_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (vote === 0) {
      delete map[commentId];
    } else {
      map[commentId] = vote;
    }
    localStorage.setItem(COMMENT_VOTES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

export function CommentSection({
  postId,
  userSession,
  initialCount,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Load comments when opened
  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getComments(postId, userSession.anonUserId);
      setComments(data);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleCreateComment = (parentId: string | null = null, textToSubmit: string) => {
    if (!textToSubmit.trim()) return;
    setErrorNotice(null);

    startTransition(async () => {
      try {
        const res = await createComment({
          postId,
          parentId,
          content: textToSubmit.trim(),
          anonUserId: userSession.anonUserId,
        });

        if (!res.success) {
          setErrorNotice(res.error || "Failed to post comment.");
          return;
        }

        if (parentId) {
          setReplyText("");
          setReplyingToId(null);
        } else {
          setNewCommentText("");
        }

        // Reload fresh comments tree
        await loadComments();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error posting comment.";
        setErrorNotice(message);
      }
    });
  };

  const handleVote = async (commentId: string, voteType: 1 | -1) => {
    try {
      const res = await castVote({
        targetId: commentId,
        targetType: "comment",
        voteType,
        anonUserId: userSession.anonUserId,
      });

      if (res.success) {
        setStoredCommentVote(commentId, res.userVote);
        // Optimistic update of local comments tree
        const updateTree = (list: CommentDTO[]): CommentDTO[] => {
          return list.map((item) => {
            if (item.id === commentId) {
              return {
                ...item,
                score: res.newScore,
                upvotes: res.newUpvotes,
                downvotes: res.newDownvotes,
                userVote: res.userVote,
              };
            }
            if (item.replies && item.replies.length > 0) {
              return { ...item, replies: updateTree(item.replies) };
            }
            return item;
          });
        };
        setComments((prev) => updateTree(prev));
      }
    } catch (err) {
      console.error("Failed to cast comment vote:", err);
    }
  };

  const renderComment = (comment: CommentDTO, depth = 0) => {
    const persona = getAnonymousPersona(comment.anonUserId);
    const isReplying = replyingToId === comment.id;
    const currentVote = getStoredCommentVote(comment.id) || comment.userVote || 0;

    return (
      <div
        key={comment.id}
        className={`relative ${
          depth > 0 ? "ml-4 sm:ml-7 pl-3 border-l-2 border-[#6C1C74]/25 mt-3" : "mt-4"
        }`}
      >
        <div className="p-3 rounded-xl bg-card border border-border shadow-xs hover:border-[#6C1C74]/30 transition-colors">
          {/* Commenter Header */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: persona.badgeColor || "#6C1C74" }}
              />
              <span className="font-semibold text-foreground">{persona.name}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{persona.tag}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Comment Content */}
          <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>

          {/* Actions: Upvote / Downvote & Reply */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs">
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border">
              <button
                type="button"
                onClick={() => handleVote(comment.id, 1)}
                className={`p-1 rounded-md transition ${
                  currentVote === 1
                    ? "text-[#6C1C74] dark:text-[#d880ea] bg-[#6C1C74]/15 dark:bg-[#b54ec4]/20"
                    : "text-muted-foreground hover:text-[#6C1C74] dark:hover:text-[#d880ea]"
                }`}
                title="Upvote comment"
              >
                <ArrowBigUp className="w-4 h-4" />
              </button>
              <span
                className={`px-1.5 text-xs font-semibold ${
                  comment.score > 0
                    ? "text-[#6C1C74] dark:text-[#d880ea]"
                    : comment.score < 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {comment.score}
              </span>
              <button
                type="button"
                onClick={() => handleVote(comment.id, -1)}
                className={`p-1 rounded-md transition ${
                  currentVote === -1
                    ? "text-red-500 bg-red-500/15"
                    : "text-muted-foreground hover:text-red-500 dark:hover:text-red-400"
                }`}
                title="Downvote comment"
              >
                <ArrowBigDown className="w-4 h-4" />
              </button>
            </div>

            {depth < 3 && (
              <button
                type="button"
                onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                className="flex items-center gap-1 text-muted-foreground hover:text-[#6C1C74] dark:hover:text-[#d880ea] font-medium transition cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>{isReplying ? "Cancel" : "Reply"}</span>
              </button>
            )}
          </div>

          {/* Nested Reply Input */}
          {isReplying && (
            <div className="mt-3 pt-3 border-t border-border animate-in fade-in">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${persona.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={1000}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-input bg-background text-xs focus:ring-1 focus:ring-[#6C1C74] focus:outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCreateComment(comment.id, replyText);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCreateComment(comment.id, replyText)}
                  disabled={isSubmitting || !replyText.trim()}
                  className="bg-[#6C1C74] hover:bg-[#58165E] disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recursive Children Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-border animate-in fade-in">
      {/* Top Comment Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Write an anonymous response..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            maxLength={1000}
            className="flex-1 px-3.5 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm focus:ring-2 focus:ring-[#6C1C74]/40 focus:outline-hidden transition"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCreateComment(null, newCommentText);
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleCreateComment(null, newCommentText)}
            disabled={isSubmitting || !newCommentText.trim()}
            className="bg-[#6C1C74] hover:bg-[#58165E] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Reply</span>
          </button>
        </div>

        {errorNotice && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}
      </div>

      {/* Comment List */}
      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-[#6C1C74]" />
          <span>Loading anonymous discussion...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No comments yet. Start the conversation completely anonymously!
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => renderComment(comment, 0))}
        </div>
      )}
    </div>
  );
}

export default CommentSection;
