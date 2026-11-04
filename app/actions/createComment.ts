"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import { moderateContent } from "@/lib/moderation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { generateAnonymizedClientHash, checkRateLimit } from "@/lib/ratelimit";
import { ActionResult } from "./createPost";

export interface CreateCommentInput {
  postId: string;
  parentId?: string | null;
  content: string;
  anonUserId: string;
  turnstileToken?: string;
}

export async function createComment(input: CreateCommentInput): Promise<ActionResult> {
  try {
    const { postId, parentId, content, anonUserId, turnstileToken = "" } = input;

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return { success: false, error: "Invalid post ID." };
    }

    if (parentId && !Types.ObjectId.isValid(parentId)) {
      return { success: false, error: "Invalid parent comment ID." };
    }

    if (!anonUserId || typeof anonUserId !== "string" || anonUserId.trim().length === 0) {
      return { success: false, error: "Anonymous identity error. Please refresh." };
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return { success: false, error: "Comment cannot be empty." };
    }

    if (content.length > 1000) {
      return { success: false, error: "Comment cannot exceed 1000 characters." };
    }

    // 1. Network Headers & Anonymized Rate Limit
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "127.0.0.1";
    const userAgent = headerList.get("user-agent") || "unknown";

    const clientHash = generateAnonymizedClientHash(ip, userAgent);
    const rateLimit = await checkRateLimit(clientHash, "create_comment");
    if (!rateLimit.success) {
      const waitMinutes = Math.ceil((rateLimit.reset - Math.floor(Date.now() / 1000)) / 60);
      return {
        success: false,
        error: `Commenting too fast. Please wait ${waitMinutes} minute(s).`,
      };
    }

    // 2. Cloudflare Turnstile Verification (if token provided)
    if (turnstileToken) {
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
      if (!turnstileCheck.success) {
        return { success: false, error: turnstileCheck.message || "Bot challenge failed." };
      }
    }

    // 3. Local Automated Content Moderation (AI-Free)
    const moderation = moderateContent(content);
    if (!moderation.isClean) {
      return {
        success: false,
        error: moderation.reason || "Comment rejected: violates university guidelines.",
        flaggedKeywords: moderation.flaggedKeywords,
      };
    }

    await connectToDatabase();

    // Verify post exists
    const postObjectId = new Types.ObjectId(postId);
    const post = await Post.findById(postObjectId);
    if (!post) {
      return { success: false, error: "Post not found or has expired." };
    }

    const newComment = await Comment.create({
      postId: postObjectId,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      anonUserId: anonUserId.trim(),
      content: content.trim(),
      upvotes: 0,
      downvotes: 0,
      score: 0,
    });

    // Increment post comment counter
    await Post.findByIdAndUpdate(postObjectId, { $inc: { commentCount: 1 } });

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: newComment._id.toString(),
        postId: newComment.postId.toString(),
        parentId: newComment.parentId ? newComment.parentId.toString() : null,
        anonUserId: newComment.anonUserId,
        content: newComment.content,
        score: newComment.score,
        createdAt: newComment.createdAt,
      },
    };
  } catch (error) {
    console.error("Error creating comment:", error);
    return {
      success: false,
      error: "Failed to submit comment. Please try again.",
    };
  }
}
