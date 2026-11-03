import { v2 as cloudinary } from "cloudinary";
export { MAX_MEDIA_SIZE_BYTES, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from "./constants";

export interface SignedUploadParams {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  imageMetadata: boolean;
}

/**
 * Generates an HMAC SHA-1 signature for direct client-to-Cloudinary upload.
 * Enforces EXIF stripping and anonymized folder structure.
 */
export function generateUploadSignature(folder: string = "superior_connection/anon_uploads"): SignedUploadParams {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

  // Parameters to sign in alphabetical order as required by Cloudinary
  const paramsToSign: Record<string, string | number | boolean> = {
    folder,
    image_metadata: false, // Force automatic EXIF removal (GPS, device, timestamp)
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    folder,
    signature,
    apiKey,
    cloudName,
    imageMetadata: false,
  };
}

export default cloudinary;
