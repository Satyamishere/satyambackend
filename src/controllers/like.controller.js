import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const existing = await Like.findOne({
    video: videoId,
    user: req.user._id,
  });

  if (existing) {
    await existing.deleteOne();
    return res.status(200).json(
      new ApiResponse(200, null, "Video unliked")
    );
  }

  await Like.create({
    video: videoId,
    user: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Video liked")
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const existing = await Like.findOne({
    comment: commentId,
    user: req.user._id,
  });

  if (existing) {
    await existing.deleteOne();
    return res.status(200).json(
      new ApiResponse(200, null, "Comment unliked")
    );
  }

  await Like.create({
    comment: commentId,
    user: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Comment liked")
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const existing = await Like.findOne({
    tweet: tweetId,
    user: req.user._id,
  });

  if (existing) {
    await existing.deleteOne();
    return res.status(200).json(
      new ApiResponse(200, null, "Tweet unliked")
    );
  }

  await Like.create({
    tweet: tweetId,
    user: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Tweet liked")
  );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likes = await Like.find({ user: req.user._id, video: { $exists: true } })
    .populate({
      path: "video",
      populate: { path: "owner", select: "username fullName avatar" }
    });

  const likedVideos = likes.map(like => like.video).filter(Boolean);

  return res.status(200).json(
    new ApiResponse(200, likedVideos, "Liked videos fetched")
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos
};
