/**
 * Cloudflare Turnstile Server-Side Verification
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export interface TurnstileVerificationResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; message?: string }> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // In local development or testing without key, gracefully bypass
  if (!secretKey || secretKey === "1x0000000000000000000000000000000AA") {
    // Official Cloudflare dummy secret that always passes
    return { success: true };
  }

  if (!token) {
    return {
      success: false,
      message: "Human verification failed: Missing Turnstile security token.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data: TurnstileVerificationResponse = await response.json();

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      message: `Bot verification failed: ${(data["error-codes"] || ["Verification failed"]).join(", ")}`,
    };
  } catch (error) {
    console.error("Cloudflare Turnstile verification error:", error);
    // Fail secure or allow fallback depending on environment
    return {
      success: false,
      message: "Error verifying security challenge. Please try again.",
    };
  }
}
