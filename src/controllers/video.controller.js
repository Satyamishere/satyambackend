import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
  });

  return res.status(200).json(new ApiResponse(200, "successfully video uploaded"));
});


const getVideoById = asyncHandler(async (req, res) => {
  const { title } = req.params;
  if (!title) {
    throw new ApiError(202, "give correct url dumbass . Video not found");
  }
  const video = await Video.findOne({ title: title });
  return res.status(200).json(
    new ApiResponse(
      200,
      { VideoID: video._id }, // you can just return video._id but if multiple val to be returned then u cant use this way have to send it wrapped
      "id successfully found"
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const videolocalpath = req.file?.path;
  const videoId = req.params.id;

  const curr_video = await Video.findById(videoId); //findOne({_id:videoId})
  if (!curr_video) {
    throw new ApiError(404, "video not found in videos");
  }
  if (!(req.user._id.toString() === curr_video.owner.toString())) {
    throw new ApiError(400, " you are not the fucking owner of this video");
  }

  const video = await uploadOnCloudinary(videolocalpath);
  if (!video) {
    throw new ApiError(404, " wrong format mf");
  }
  curr_video.videoFile.url = video.url;
  curr_video.videoFile.public_id = video.public_id;
  await curr_video.save(); //need to save in database
  return res.status(200).json(new ApiResponse(200, {}, "video updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const curr_video = await Video.findById(videoId);
  if (!curr_video) {
    throw new ApiError(404, " video not found");
  }

  // Essential fix 1: Correct property name (videoFile instead of videoFil)
  const cloudinary_id = curr_video.videoFile?.public_id;
  if (!cloudinary_id) {
    throw new ApiError(404, "No Cloudinary reference found");
  }
  // Essential fix 2: Remove quotes around variable name
  await cloudinary.uploader.destroy(cloudinary_id, {
    resource_type: "video",
  });

  // Essential fix 3: Clear both url and public_id
  curr_video.videoFile = { url: "", public_id: "" };
  await curr_video.save();

  res.status(200).json(new ApiResponse(200, " successfully deleted"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const filter = {};

  // for filter based on userId and queries(title,description etc)
  if (userId) {
    filter.owner = userId;
  }
  if (query) {
    // this or operator is so that if either of the two filed matched  then we will take it
    $or: [
      { title: { $regex: query.title } },
      { description: { $regex: query.description } },
    ];
  }
  // for sort
  const sort = {};
  const sortbasedon = sortBy;
  const sortorder = sortTypes === "asc" ? 1 : -1;
  sort[sortbasedon || "createdAt"] = sortorder;

  const amountskip = (page - 1) * limit;
  const videos = await Video.find(filter).sort(sort).skip(amountskip);
  //TODO: do using pipeline too its simple.
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  // 1. Find video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 2. Check if current user is the owner
  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  // 3. Toggle publish status
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
}