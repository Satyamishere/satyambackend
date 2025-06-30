import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import cloudinary from "cloudinary";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }
  if (!videoFileLocalPath) {
    throw new ApiError(400, "videoFile file is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail upload failed");
  }
  if (!videoFile) {
    throw new ApiError(400, "videoFile upload failed");
  }

  const video = await Video.create({
    videoFile: {
      url: videoFile.url,
      public_id: videoFile.public_id,
    },
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, "successfully video uploaded"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { title } = req.params;
  if (!title) {
    throw new ApiError(202, "Give correct URL. Video not found");
  }
  const video = await Video.findOne({ title: title });
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { VideoID: video._id },
      "id successfully found"
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const videolocalpath = req.file?.path;
  const videoId = req.params.id;

  const curr_video = await Video.findById(videoId);
  if (!curr_video) {
    throw new ApiError(404, "video not found in videos");
  }

  if (!(req.user._id.toString() === curr_video.owner.toString())) {
    throw new ApiError(400, "You are not the owner of this video");
  }

  const video = await uploadOnCloudinary(videolocalpath);
  if (!video) {
    throw new ApiError(404, "Upload failed or wrong format");
  }

  curr_video.videoFile.url = video.url;
  curr_video.videoFile.public_id = video.public_id;
  await curr_video.save();

  return res.status(200).json(new ApiResponse(200, {}, "video updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const curr_video = await Video.findById(videoId);
  if (!curr_video) {
    throw new ApiError(404, "video not found");
  }

  const cloudinary_id = curr_video.videoFile?.public_id;
  if (!cloudinary_id) {
    throw new ApiError(404, "No Cloudinary reference found");
  }

  await cloudinary.uploader.destroy(cloudinary_id, {
    resource_type: "video",
  });

  curr_video.videoFile = { url: "", public_id: "" };
  await curr_video.save();

  res.status(200).json(new ApiResponse(200, "successfully deleted"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const filter = {};

  if (userId) {
    filter.owner = userId;
  }

  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  const sort = {};
  const sortbasedon = sortBy;
  const sortorder = sortType === "asc" ? 1 : -1;
  sort[sortbasedon || "createdAt"] = sortorder;

  const amountskip = (page - 1) * limit;
  const videos = await Video.find(filter).sort(sort).skip(amountskip).limit(Number(limit));

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res.status(200).json(
    new ApiResponse(200, "Video publish status toggled successfully")
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
};
