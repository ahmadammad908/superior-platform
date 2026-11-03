"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import { moderateContent } from "@/lib/moderation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { generateAnonymizedClientHash, checkRateLimit } from "@/lib/ratelimit";

export interface CreatePostInput {
  anonUserId: string;
  title?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  expiryDays?: number | null;
  turnstileToken: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  flaggedKeywords?: string[];
}

export async function createPost(input: CreatePostInput): Promise<ActionResult> {
  try {
    const { anonUserId, title = "", content, mediaUrl, mediaType, expiryDays, turnstileToken } = input;

    // 1. Validation of required inputs
    if (!anonUserId || typeof anonUserId !== "string" || anonUserId.trim().length === 0) {
      return { success: false, error: "Anonymous identity error. Please refresh and try again." };
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return { success: false, error: "Post content cannot be empty." };
    }

    if (content.length > 2000) {
      return { success: false, error: "Content cannot exceed 2000 characters." };
    }

    if (title && title.length > 120) {
      return { success: false, error: "Title cannot exceed 120 characters." };
    }

    // 2. Extract Client Network Headers for Anonymized Hash Rate Limiting
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "127.0.0.1";
    const userAgent = headerList.get("user-agent") || "unknown";

    const clientHash = generateAnonymizedClientHash(ip, userAgent);

    // 3. Rate Limit Check (5 posts per 10 minutes per hashed client)
    const rateLimit = await checkRateLimit(clientHash, "create_post");
    if (!rateLimit.success) {
      const waitMinutes = Math.ceil((rateLimit.reset - Math.floor(Date.now() / 1000)) / 60);
      return {
        success: false,
        error: `Rate limit reached. You can create another post in ${waitMinutes} minute(s).`,
      };
    }

    // 4. Cloudflare Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileResult.success) {
      return {
        success: false,
        error: turnstileResult.message || "Bot challenge verification failed.",
      };
    }

    // 5. Local Automated Content Moderation (AI-Free & Zero-Cost)
    const contentCheck = moderateContent(content);
    if (!contentCheck.isClean) {
      return {
        success: false,
        error: contentCheck.reason || "Your post was rejected by our local moderation filter.",
        flaggedKeywords: contentCheck.flaggedKeywords,
      };
    }

    if (title) {
      const titleCheck = moderateContent(title);
      if (!titleCheck.isClean) {
        return {
          success: false,
          error: titleCheck.reason || "Title was rejected by our local moderation filter.",
          flaggedKeywords: titleCheck.flaggedKeywords,
        };
      }
    }

    // 6. Calculate TTL auto-expiration date if set
    let expiresAt: Date | null = null;
    if (expiryDays && typeof expiryDays === "number" && expiryDays > 0) {
      expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    // 7. Connect to Database and Persist Post
    await connectToDatabase();

    const newPost = new Post({
      anonUserId: anonUserId.trim(),
      title: title.trim(),
      content: content.trim(),
      mediaUrl: mediaUrl?.trim() || undefined,
      mediaType: mediaUrl ? mediaType || "image" : undefined,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      commentCount: 0,
      expiresAt,
    });
    await newPost.save();

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: newPost._id.toString(),
        anonUserId: newPost.anonUserId,
        title: newPost.title,
        content: newPost.content,
        mediaUrl: newPost.mediaUrl,
        mediaType: newPost.mediaType,
        score: newPost.score,
        expiresAt: newPost.expiresAt ? newPost.expiresAt.toISOString() : null,
        createdAt: newPost.createdAt ? newPost.createdAt.toISOString() : new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Failed to create post:", error);
    const message = error instanceof Error ? error.message : "Unknown database error.";
    return {
      success: false,
      error: `Could not publish post: ${message}`,
    };
  }
}
