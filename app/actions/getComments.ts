"use server";

import { headers } from "next/headers";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Vote from "@/models/Vote";
import { generateVoterHash } from "@/lib/anonUser";

export interface CommentDTO {
  id: string;
  postId: string;
  parentId?: string | null;
  anonUserId: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  userVote?: number;
  replies?: CommentDTO[];
}

export async function getComments(postId: string, anonUserId?: string): Promise<CommentDTO[]> {
  try {
    if (!postId || !Types.ObjectId.isValid(postId)) {
      // In demo mode or invalid ID, return demo comments
      return getFallbackComments(postId);
    }

    await connectToDatabase();

    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "127.0.0.1";

    const voterHash = anonUserId ? generateVoterHash(anonUserId, ip) : null;

    const rawComments = await Comment.find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: 1 })
      .lean();

    // Map votes
    let userVotesMap = new Map<string, number>();
    if (voterHash && rawComments.length > 0) {
      const commentIds = rawComments.map((c) => c._id);
      const userVotes = await Vote.find({
        targetId: { $in: commentIds },
        targetType: "comment",
        voterHash,
      }).lean();

      userVotes.forEach((v) => {
        userVotesMap.set(v.targetId.toString(), v.voteType);
      });
    }

    const flatComments: CommentDTO[] = rawComments.map((c) => ({
      id: c._id.toString(),
      postId: c.postId.toString(),
      parentId: c.parentId ? c.parentId.toString() : null,
      anonUserId: c.anonUserId,
      content: c.content,
      upvotes: c.upvotes || 0,
      downvotes: c.downvotes || 0,
      score: c.score || 0,
      createdAt: c.createdAt.toISOString(),
      userVote: userVotesMap.get(c._id.toString()) || 0,
      replies: [],
    }));

    // Build hierarchical tree
    const rootComments: CommentDTO[] = [];
    const lookup = new Map<string, CommentDTO>();

    flatComments.forEach((c) => {
      c.replies = [];
      lookup.set(c.id, c);
    });

    flatComments.forEach((c) => {
      if (c.parentId && lookup.has(c.parentId)) {
        lookup.get(c.parentId)!.replies!.push(c);
      } else {
        rootComments.push(c);
      }
    });

    return rootComments;
  } catch (error) {
    console.warn("Could not fetch comments from MongoDB, returning fallback:", error);
    return getFallbackComments(postId);
  }
}

function getFallbackComments(postId: string): CommentDTO[] {
  const now = Date.now();
  return [
    {
      id: "demo-comment-1",
      postId,
      parentId: null,
      anonUserId: "usr_331199a",
      content: "Can confirm! Just grabbed a desk on the 4th floor. Super quiet and AC is on point.",
      upvotes: 12,
      downvotes: 0,
      score: 12,
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      userVote: 0,
      replies: [
        {
          id: "demo-comment-2",
          postId,
          parentId: "demo-comment-1",
          anonUserId: "usr_442288b",
          content: "Are there still open sockets near the corner windows?",
          upvotes: 4,
          downvotes: 0,
          score: 4,
          createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
          userVote: 0,
          replies: [
            {
              id: "demo-comment-3",
              postId,
              parentId: "demo-comment-2",
              anonUserId: "usr_331199a",
              content: "Yes, at least 3 free desks left as of 5 mins ago!",
              upvotes: 6,
              downvotes: 0,
              score: 6,
              createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
              userVote: 0,
              replies: [],
            },
          ],
        },
      ],
    },
  ];
}
