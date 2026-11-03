"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import Vote from "@/models/Vote";
import { generateVoterHash } from "@/lib/anonUser";
import { generateAnonymizedClientHash, checkRateLimit } from "@/lib/ratelimit";

export interface VoteInput {
  targetId: string;
  targetType: "post" | "comment";
  voteType: 1 | -1;
  anonUserId: string;
}

export interface VoteResult {
  success: boolean;
  userVote: number; // 0 (none), 1 (up), -1 (down)
  newScore: number;
  newUpvotes: number;
  newDownvotes: number;
  error?: string;
}

export async function castVote(input: VoteInput): Promise<VoteResult> {
  try {
    const { targetId, targetType, voteType, anonUserId } = input;

    if (!Types.ObjectId.isValid(targetId)) {
      return { success: false, userVote: 0, newScore: 0, newUpvotes: 0, newDownvotes: 0, error: "Invalid ID" };
    }

    if (![1, -1].includes(voteType)) {
      return { success: false, userVote: 0, newScore: 0, newUpvotes: 0, newDownvotes: 0, error: "Invalid vote" };
    }

    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "127.0.0.1";
    const userAgent = headerList.get("user-agent") || "unknown";

    const clientHash = generateAnonymizedClientHash(ip, userAgent);
    const rateLimit = await checkRateLimit(clientHash, "vote");
    if (!rateLimit.success) {
      return {
        success: false,
        userVote: 0,
        newScore: 0,
        newUpvotes: 0,
        newDownvotes: 0,
        error: "Voting too fast. Please slow down.",
      };
    }

    const voterHash = generateVoterHash(anonUserId, ip);
    await connectToDatabase();

    const targetObjectId = new Types.ObjectId(targetId);

    const existingTarget =
      targetType === "post"
        ? await Post.findById(targetObjectId)
        : await Comment.findById(targetObjectId);

    if (!existingTarget) {
      return {
        success: false,
        userVote: 0,
        newScore: 0,
        newUpvotes: 0,
        newDownvotes: 0,
        error: "Item not found.",
      };
    }

    // Look for previous vote by this anonymous user on this item
    const existingVote = await Vote.findOne({
      targetId: targetObjectId,
      targetType,
      voterHash,
    });

    let currentScore = existingTarget.score || 0;
    let currentUp = existingTarget.upvotes || 0;
    let currentDown = existingTarget.downvotes || 0;
    let finalUserVote = 0;

    if (!existingVote) {
      // New vote
      await Vote.create({
        targetId: targetObjectId,
        targetType,
        voterHash,
        voteType,
      });

      if (voteType === 1) {
        currentUp += 1;
        currentScore += 1;
      } else {
        currentDown += 1;
        currentScore -= 1;
      }
      finalUserVote = voteType;
    } else if (existingVote.voteType === voteType) {
      // Clicked same button again -> Cancel vote (Toggle off)
      await Vote.deleteOne({ _id: existingVote._id });

      if (voteType === 1) {
        currentUp = Math.max(0, currentUp - 1);
        currentScore -= 1;
      } else {
        currentDown = Math.max(0, currentDown - 1);
        currentScore += 1;
      }
      finalUserVote = 0;
    } else {
      // Switched vote from up to down or vice versa
      existingVote.voteType = voteType;
      await existingVote.save();

      if (voteType === 1) {
        // Switched from down (-1) to up (+1): +2 diff
        currentDown = Math.max(0, currentDown - 1);
        currentUp += 1;
        currentScore += 2;
      } else {
        // Switched from up (+1) to down (-1): -2 diff
        currentUp = Math.max(0, currentUp - 1);
        currentDown += 1;
        currentScore -= 2;
      }
      finalUserVote = voteType;
    }

    // Update target document
    existingTarget.score = currentScore;
    existingTarget.upvotes = currentUp;
    existingTarget.downvotes = currentDown;
    await existingTarget.save();

    revalidatePath("/");

    return {
      success: true,
      userVote: finalUserVote,
      newScore: currentScore,
      newUpvotes: currentUp,
      newDownvotes: currentDown,
    };
  } catch (error) {
    console.error("Error in castVote:", error);
    return {
      success: false,
      userVote: 0,
      newScore: 0,
      newUpvotes: 0,
      newDownvotes: 0,
      error: "Could not register vote.",
    };
  }
}
