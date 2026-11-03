import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IComment extends Document {
  postId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  anonUserId: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    anonUserId: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      trim: true,
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
    },
  },
  {
    timestamps: true,
  }
);

CommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);
export default Comment;
