import { NextRequest, NextResponse } from "next/server";
import { generateUploadSignature } from "@/lib/cloudinary";
import { generateAnonymizedClientHash, checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Extract non-PII headers for hashed rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const clientHash = generateAnonymizedClientHash(ip, userAgent);

    // 2. Enforce Hashed Rate Limiting (Prevents signature generation abuse)
    const rateLimit = await checkRateLimit(clientHash, "upload_signature");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before uploading more media.",
          resetInSeconds: rateLimit.reset - Math.floor(Date.now() / 1000),
        },
        { status: 429 }
      );
    }

    // 3. Optional folder specification from body
    let folder = "superior_connection/anon_uploads";
    try {
      const body = await req.json();
      if (body.folder && typeof body.folder === "string") {
        // Sanitize folder
        folder = body.folder.replace(/[^a-zA-Z0-9_\-/]/g, "");
      }
    } catch {
      // Body is optional
    }

    // 4. Generate direct signed upload parameters with enforced EXIF removal
    const signedParams = generateUploadSignature(folder);

    return NextResponse.json(
      {
        ...signedParams,
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error generating Cloudinary upload signature:", error);
    return NextResponse.json(
      { error: "Internal server error while preparing media upload." },
      { status: 500 }
    );
  }
}
