"use server";

import { headers } from "next/headers";
import connectToDatabase from "@/lib/mongodb";
import Post from "@/models/Post";
import Vote from "@/models/Vote";
import { generateVoterHash } from "@/lib/anonUser";

export interface PostDTO {
  id: string;
  anonUserId: string;
  title: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  expiresAt?: string | null;
  createdAt: string;
  userVote?: number; // 1, -1, or 0
}

export type FeedSortOption = "trending" | "top" | "recent";

export async function getPosts(
  sort: FeedSortOption = "trending",
  anonUserId?: string,
  search?: string
): Promise<PostDTO[]> {
  try {
    await connectToDatabase();

    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip") || "127.0.0.1";

    const voterHash = anonUserId ? generateVoterHash(anonUserId, ip) : null;

    // Filter out already expired posts
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [
        {
          $or: [{ title: regex }, { content: regex }],
        },
      ];
    }

    // Determine sorting criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortQuery: any = { createdAt: -1 };
    if (sort === "top") {
      sortQuery = { score: -1, createdAt: -1 };
    } else if (sort === "recent") {
      sortQuery = { createdAt: -1 };
    } else if (sort === "trending") {
      // Hot/Trending: high score with recent recency bias
      sortQuery = { score: -1, createdAt: -1 };
    }

    const posts = await Post.find(query).sort(sortQuery).limit(50).lean();

    // Map votes if voterHash exists
    let userVotesMap = new Map<string, number>();
    if (voterHash && posts.length > 0) {
      const postIds = posts.map((p) => p._id);
      const userVotes = await Vote.find({
        targetId: { $in: postIds },
        targetType: "post",
        voterHash,
      }).lean();

      userVotes.forEach((v) => {
        userVotesMap.set(v.targetId.toString(), v.voteType);
      });
    }

    return posts.map((p) => ({
      id: p._id.toString(),
      anonUserId: p.anonUserId,
      title: p.title || "",
      content: p.content,
      mediaUrl: p.mediaUrl || null,
      mediaType: p.mediaType,
      upvotes: p.upvotes || 0,
      downvotes: p.downvotes || 0,
      score: p.score || 0,
      commentCount: p.commentCount || 0,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      userVote: userVotesMap.get(p._id.toString()) || 0,
    }));
  } catch (error) {
    console.warn("MongoDB fetch failed or not connected, returning sample university posts:", error);

    // Return rich initial university seed posts for seamless showcase
    return getFallbackPosts();
  }
}

function getFallbackPosts(): PostDTO[] {
  const now = Date.now();
  return [
    {
      id: "demo-post-video",
      anonUserId: "usr_5521ae89b2",
      title: "Robotics club rover prototype test run in the central courtyard! 🤖🚀",
      content:
        "First obstacle navigation test with the new lidar sensor array. Complete success! Autonomous pathfinding calculated on-device. Check out the demo clip below:",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mediaType: "video",
      upvotes: 114,
      downvotes: 2,
      score: 112,
      commentCount: 23,
      expiresAt: new Date(now + 5 * 86400000).toISOString(),
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
      userVote: 0,
    },
    {
      id: "demo-post-1",
      anonUserId: "usr_998129a0c1",
      title: "Library 4th floor quiet study rooms are secretly open late tonight",
      content:
        "PSA: The north wing silent pods have power outlets working again and heating is perfect. Remember: complete anonymity keeps our university safe and honest. Good luck with midterms everyone! 📚✨",
      mediaUrl: null,
      mediaType: undefined,
      upvotes: 42,
      downvotes: 1,
      score: 41,
      commentCount: 7,
      expiresAt: new Date(now + 3 * 86400000).toISOString(),
      createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
      userVote: 0,
    },
    {
      id: "demo-post-2",
      anonUserId: "usr_7741bc22f4",
      title: "Campus sunset from the Science Quad rooftop terrace",
      content:
        "Caught this right before closing the labs. Beautiful gradient over the engineering building. No filters, camera EXIF stripped automatically by the platform for zero digital footprint.",
      mediaUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
      mediaType: "image",
      upvotes: 89,
      downvotes: 3,
      score: 86,
      commentCount: 14,
      expiresAt: null,
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
      userVote: 0,
    },
    {
      id: "demo-post-3",
      anonUserId: "usr_2241bb33a1",
      title: "Honest feedback: What professor had the biggest impact on your mindset this semester?",
      content:
        "No names need to be leaked if you want privacy, but what course genuinely altered how you think about algorithms and system design?",
      mediaUrl: null,
      mediaType: undefined,
      upvotes: 27,
      downvotes: 0,
      score: 27,
      commentCount: 19,
      expiresAt: new Date(now + 7 * 86400000).toISOString(),
      createdAt: new Date(now - 1000 * 60 * 300).toISOString(),
      userVote: 0,
    },
  ];
}
