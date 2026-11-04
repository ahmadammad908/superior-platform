import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IVote extends Document {
  targetId: Types.ObjectId;
  targetType: "post" | "comment";
  voterHash: string;
  voteType: number; // 1 for upvote, -1 for downvote
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
      index: true,
    },
    voterHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    voteType: {
      type: Number,
      required: true,
      enum: [1, -1],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate votes by same voterHash on same post/comment
VoteSchema.index({ targetId: 1, targetType: 1, voterHash: 1 }, { unique: true });

export const Vote: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>("Vote", VoteSchema);
export default Vote;
