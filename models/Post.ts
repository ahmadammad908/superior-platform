import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  anonUserId: string;
  title?: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    anonUserId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      maxlength: [120, "Title cannot exceed 120 characters"],
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      maxlength: [2000, "Content cannot exceed 2000 characters"],
      trim: true,
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: undefined,
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB TTL index for automatic deletion of expired posts
// Documents with null expiresAt will not expire
PostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } });

// Index for trending algorithm and sorting
PostSchema.index({ createdAt: -1 });
PostSchema.index({ score: -1, createdAt: -1 });

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);
export default Post;
