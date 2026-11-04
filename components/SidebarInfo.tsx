"use client";

import React from "react";
import {
  ShieldCheck,
  EyeOff,
  Sparkles,
  Lock,
  Clock,
  HeartHandshake,
 
} from "lucide-react";

export function SidebarInfo() {
  return (
    <div className="w-full space-y-4">
      {/* Platform Security Snapshot */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#6C1C74]/15 dark:bg-[#b54ec4]/25 text-[#6C1C74] dark:text-[#d880ea]">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-[#6C1C74] dark:text-[#d880ea]">
            Superior Security Shield everyone protects you 
          </h3>
        </div>

        <ul className="space-y-2.5 text-xs text-muted-foreground leading-snug">
          <li className="flex items-start gap-2">
            <EyeOff className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Zero Accounts:</strong> Ephemeral UUID stored only
              in your browser.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Hashed Rate Limiting:</strong> SHA-256 salted hash
              in Redis protects against spam without logging raw IPs.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Local AI-Free Moderation:</strong> Real-time
              in-memory keyword filter blocks slurs and doxxing.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Auto-Expiry TTL:</strong> Posts can automatically
              self-destruct from the database.
            </span>
          </li>
        </ul>
      </div>

      {/* Community Honor Code */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-[#6C1C74]" />
          <h3 className="font-bold text-sm text-foreground">Campus Honor Code</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Superior Connection is built to empower student voices with genuine freedom of
          expression. Please respect fellow students:
        </p>
        <div className="space-y-1.5 text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C1C74]" />
            <span>No personal phone numbers, emails, or doxxing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C1C74]" />
            <span>No hate speech or harassment toward specific students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C1C74]" />
            <span>No selling exam questions or test paper leaks</span>
          </div>
        </div>
      </div>

      {/* University Footer */}
      <div className="text-[11px] text-muted-foreground px-2 space-y-1">
        <div className="flex items-center justify-between">
          <span>Superior Connection © {new Date().getFullYear()}</span>
          <span className="text-[#6C1C74] dark:text-[#d880ea] font-semibold">v1.0 Serverless</span>
        </div>
        <p className="text-[10px] text-muted-foreground/80">
          Built with Next.js App Router, React 19 & Tailwind CSS.
        </p>
      </div>
    </div>
  );
}

export default SidebarInfo;
