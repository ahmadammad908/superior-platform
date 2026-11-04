"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Send,
  Clock,
  Sparkles,
  ShieldAlert,
  Loader2,
  ShieldCheck,
  EyeOff,
  Type,
  FileText,
  Lock,
} from "lucide-react";
import AnonymousUploader from "./AnonymousUploader";
import TurnstileWidget from "./TurnstileWidget";
import { createPost } from "@/app/actions/createPost";
import { AnonUserSession } from "@/hooks/useAnonUser";
import { PostDTO } from "@/app/actions/getPosts";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: AnonUserSession;
  onPostCreated: (newPost: PostDTO) => void;
}

const EXPIRY_OPTIONS = [
  { label: "Permanent", sub: "Never expires", value: null },
  { label: "24 Hours", sub: "1 day TTL", value: 1 },
  { label: "3 Days", sub: "Auto-removes", value: 3 },
  { label: "7 Days", sub: "1 week TTL", value: 7 },
  { label: "30 Days", sub: "1 month TTL", value: 30 },
];

export function CreatePostModal({
  isOpen,
  onClose,
  userSession,
  onPostCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{
    url: string;
    type: "image" | "video";
    originalName: string;
    size: number;
  } | null>(null);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flaggedWords, setFlaggedWords] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage("Please write some content before publishing.");
      return;
    }

    setErrorMessage(null);
    setFlaggedWords([]);

    startTransition(async () => {
      try {
        const result = await createPost({
          anonUserId: userSession.anonUserId,
          title: title.trim(),
          content: content.trim(),
          mediaUrl: media ? media.url : undefined,
          mediaType: media ? media.type : undefined,
          expiryDays,
          turnstileToken: turnstileToken || "dummy_turnstile_pass_token",
        });

        if (!result.success) {
          setErrorMessage(result.error || "Could not publish post.");
          if (result.flaggedKeywords && result.flaggedKeywords.length > 0) {
            setFlaggedWords(result.flaggedKeywords);
          }
          return;
        }

        const createdData = result.data as {
          id: string;
          anonUserId: string;
          title: string;
          content: string;
          mediaUrl?: string | null;
          mediaType?: "image" | "video";
          score: number;
          expiresAt?: string | null;
          createdAt: string;
        };

        onPostCreated({
          id: createdData.id,
          anonUserId: userSession.anonUserId,
          title: title.trim(),
          content: content.trim(),
          mediaUrl: media ? media.url : null,
          mediaType: media ? media.type : undefined,
          upvotes: 0,
          downvotes: 0,
          score: 0,
          commentCount: 0,
          expiresAt: createdData.expiresAt,
          createdAt: new Date().toISOString(),
          userVote: 0,
        });

        // Reset and close
        setTitle("");
        setContent("");
        setMedia(null);
        setExpiryDays(null);
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error submitting post.";
        setErrorMessage(message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#181222] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#35264b] rounded-3xl max-w-xl w-full shadow-2xl relative my-6 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Brand Accent Top Line */}
        <div className="h-2 w-full bg-[#6C1C74]" />

        {/* Modal Header: Clean White */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-[#2d1f40] flex items-center justify-between bg-white dark:bg-[#181222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6C1C74]/10 dark:bg-[#b54ec4]/20 flex items-center justify-center text-[#6C1C74] dark:text-[#d880ea] shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Create Anonymous Post
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                100% Anonymous • No Account Required
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body: Pristine White */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-white dark:bg-[#181222]">
          {/* Identity Shield Card: Clean White with Purple Border */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-[#231835] border border-purple-200 dark:border-[#4a3468] flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                style={{ backgroundColor: userSession.badgeColor || "#6C1C74" }}
              >
                {userSession.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Posting as{" "}
                  <span className="text-[#6C1C74] dark:text-[#d880ea]">{userSession.name}</span>{" "}
                  <span className="font-mono text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
                    {userSession.tag}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Ephemeral Client Identity (Safe &amp; Untraceable)</span>
                </div>
              </div>
            </div>

            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-[#181222] border border-purple-200 dark:border-purple-800 text-[#6C1C74] dark:text-[#d880ea] font-bold flex items-center gap-1 shadow-2xs shrink-0">
              <EyeOff className="w-3.5 h-3.5" />
              Zero-Log
            </span>
          </div>

          {/* Error / Moderation Notice */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 text-xs space-y-1.5 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{errorMessage}</span>
              </div>
              {flaggedWords.length > 0 && (
                <div className="text-[11px] text-red-600 dark:text-red-300 pl-6 font-medium">
                  Flagged keyword(s):{" "}
                  <span className="font-mono font-bold">{flaggedWords.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} id="create-post-form" className="space-y-4">
            {/* Title (Optional) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                <label className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#6C1C74] dark:text-[#d880ea]" />
                  <span>Post Title</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px]">
                    (Optional)
                  </span>
                </label>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                  {title.length}/120
                </span>
              </div>
              <input
                type="text"
                placeholder="Give your post a headline..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20182c] text-slate-900 dark:text-white text-sm font-medium focus:outline-hidden focus:border-[#6C1C74] focus:ring-4 focus:ring-[#6C1C74]/15 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
              />
            </div>

            {/* Content (Required) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                <label className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#6C1C74] dark:text-[#d880ea]" />
                  <span>Post Content</span>
                  <span className="text-[#6C1C74] dark:text-[#d880ea] font-extrabold">*</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-normal">
                  {content.length}/2000
                </span>
              </div>
              <textarea
                placeholder="What's on your mind? Share campus confessions, ask questions, or voice thoughts anonymously..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={2000}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#20182c] text-slate-900 dark:text-white text-sm font-medium leading-relaxed focus:outline-hidden focus:border-[#6C1C74] focus:ring-4 focus:ring-[#6C1C74]/15 transition resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
              />
            </div>

            {/* Media Uploader */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Attach Photo or Video
              </label>
              <AnonymousUploader
                onUploadSuccess={(uploaded) => setMedia(uploaded)}
                onClear={() => setMedia(null)}
                currentMedia={media}
              />
            </div>

            {/* Auto-Expiry (Self-Destruct) Toggle */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6C1C74] dark:text-[#d880ea]" />
                  <span>Auto-Expiry (Self-Destruct)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  MongoDB TTL Auto-Deletes
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {EXPIRY_OPTIONS.map((opt) => {
                  const isSelected = expiryDays === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setExpiryDays(opt.value)}
                      className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? "bg-[#6C1C74] dark:bg-[#b54ec4] text-white border-[#6C1C74] dark:border-[#b54ec4] shadow-md shadow-[#6C1C74]/25 scale-[1.02]"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-[#20182c] dark:hover:bg-[#2a2039] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#6C1C74]"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{opt.label}</span>
                      <span
                        className={`text-[10px] font-medium ${
                          isSelected ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bot Check Challenge */}
            <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
          </form>
        </div>

        {/* Modal Footer: Clean Soft White */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-[#140d1e] border-t border-slate-200 dark:border-[#2d1f40] flex items-center justify-between gap-2 sm:gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#6C1C74] dark:text-[#d880ea]" />
            <span>Local AI-Free Moderation Active</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-post-form"
              disabled={isPending || !content.trim()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#6C1C74] hover:bg-[#56165d] disabled:opacity-50 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-md shadow-[#6C1C74]/25 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish Anonymously</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePostModal;
