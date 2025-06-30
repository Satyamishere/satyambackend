import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId || req.user._id;

  const userExists = await User.findById(channelId);
  if (!userExists) {
    throw new ApiError(404, "Channel not found");
  }

  const totalVideos = await Video.countDocuments({ owner: channelId });

  const videoIds = await Video.find({ owner: channelId }).distinct("_id");

  const viewsAgg = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ]);
  const totalViews = viewsAgg[0]?.totalViews || 0;

  const likesAgg = await Like.aggregate([
    { $match: { video: { $in: videoIds } } },
    { $group: { _id: null, totalLikes: { $sum: 1 } } },
  ]);
  const totalLikes = likesAgg[0]?.totalLikes || 0;

  const totalSubscribers = await Subscription.countDocuments({ channel: channelId });

  return res.status(200).json(
    new ApiResponse(200, {
      totalVideos,
      totalViews,
      totalLikes,
      totalSubscribers,
    }, "Channel stats fetched")
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId || req.user._id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const videos = await Video.find({ owner: channelId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return res.status(200).json(
    new ApiResponse(200, videos, "Channel videos fetched")
  );
});

export {
  getChannelStats,
  getChannelVideos
};
