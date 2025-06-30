import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
});


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate channelId
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const ChannelSubscriber = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        subscribers: 1,
      },
    },
  ]);

  if (!ChannelSubscriber.length) {
    throw new ApiError(404, "Channel not found");
  }

  const allSubscribers = ChannelSubscriber[0].subscribers;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allSubscribers,
        "Channel subscribers fetched successfully"
      )
    );
});


const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const userSubscribedTo = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
  ]);

  if (!userSubscribedTo.length) {
    throw new ApiError(404, "Subscriber not found");
  }

  const subscriberChannelList = userSubscribedTo[0].subscribedTo;

  return res.status(200).json(
    new ApiResponse(200, subscriberChannelList, "Subscribed channel list fetched")
  );
});


export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
