"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  PlusCircle,
  Lock,
  Ghost,
  EyeOff,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { AnonUserSession } from "@/hooks/useAnonUser";

interface NavbarProps {
  userSession: AnonUserSession;
  onOpenCreateModal: () => void;
}

export function Navbar({ userSession, onOpenCreateModal }: NavbarProps) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/95 dark:bg-background/95 border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3 flex-nowrap w-full overflow-hidden">
          {/* Logo & Brand (Responsive: 'Superior' on mobile, 'Superior Connection' on tablet/desktop) */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#6C1C74] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Ghost className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col shrink-0">
              <span className="font-extrabold text-sm sm:text-lg tracking-tight text-[#6C1C74] dark:text-[#d880ea] whitespace-nowrap leading-tight">
                <span className="sm:hidden">Superior</span>
                <span className="hidden sm:inline">Superior Connection</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5 hidden md:block whitespace-nowrap">
                Anonymous University Platform
              </span>
            </div>
          </Link>

          {/* User Session & Actions (Completely fits without overflow) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
            {/* Anonymous Persona Pill (Clean #Tag without regenerate button) */}
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border border-border bg-card shadow-2xs text-xs font-semibold whitespace-nowrap shrink-0"
              title={`Anonymous persona: ${userSession.name || "Student"}`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: userSession.badgeColor || "#6C1C74" }}
              />
              <span className="text-foreground hidden lg:inline max-w-[90px] truncate">
                {userSession.name}
              </span>
              <span className="font-mono text-[#6C1C74] dark:text-[#d880ea] text-[11px] sm:text-xs">
                {userSession.tag}
              </span>
            </div>

            {/* Privacy Architecture Info Button (Desktop Only) */}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="p-2 rounded-xl text-muted-foreground hover:text-[#6C1C74] hover:bg-[#6C1C74]/10 transition-colors border border-border hidden md:flex items-center gap-1 text-xs shrink-0 cursor-pointer"
              title="View Security & Anonymity Architecture"
            >
              <Shield className="w-4 h-4 text-[#6C1C74]" />
              <span className="font-semibold">Security</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>

            {/* Create Post Button */}
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1 bg-[#6C1C74] hover:bg-[#56165d] active:scale-95 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Create Post</span>
              <span className="sm:hidden">Post</span>
            </button>
          </div>
        </div>
      </header>

      {/* Security & Zero-Log Architecture Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#6C1C74]/10 text-[#6C1C74]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#6C1C74] dark:text-[#d880ea]">
                    Superior Connection Architecture
                  </h3>
                  <p className="text-xs text-muted-foreground">Zero-Trust & Zero-PII by Design</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-muted-foreground leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <Ghost className="w-4 h-4 text-[#6C1C74] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">No Accounts or Signups:</strong> You never
                  provide your name, student ID, or password. Your browser holds an ephemeral client
                  UUID.
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <EyeOff className="w-4 h-4 text-[#6C1C74] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Hashed Rate Limiting:</strong> We use Upstash
                  Redis with a one-way cryptographically salted SHA-256 hash. Your raw IP address is
                  never stored in database rows or logs.
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <Shield className="w-4 h-4 text-[#6C1C74] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Cloudinary EXIF Stripping:</strong> All photos
                  and videos are signed and metadata-stripped before publication, discarding camera
                  make, geolocation, and timestamps.
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <Sparkles className="w-4 h-4 text-[#6C1C74] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">AI-Free Local Content Filtering:</strong>{" "}
                  Harassment, hate speech, and doxxing are filtered locally by server-side rule
                  engines with zero external paid AI tracking.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="bg-[#6C1C74] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#58165E] transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
