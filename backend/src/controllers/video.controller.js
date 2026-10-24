const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Problem = require('../models/Problem');
const SolutionVideo = require('../models/SolutionVideo');
const { env } = require('../config/env');

const generateUploadSignature = async (req, res) => {
  try {
    const { problemId } = req.params;
    if (!mongoose.isValidObjectId(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    const problem = await Problem.findById(problemId).select('_id');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `leetcode-solutions/${problemId}/${req.result._id}_${timestamp}`;
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, public_id: publicId },
      env.cloudinary.apiSecret
    );

    res.json({
      signature,
      timestamp,
      public_id: publicId,
      api_key: env.cloudinary.apiKey,
      cloud_name: env.cloudinary.cloudName,
      upload_url: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/video/upload`,
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    res.status(500).json({ message: 'Failed to generate upload credentials' });
  }
};

const saveVideoMetadata = async (req, res) => {
  try {
    const { problemId, cloudinaryPublicId, secureUrl, duration } = req.body || {};
    if (!mongoose.isValidObjectId(problemId) || !cloudinaryPublicId || !secureUrl) {
      return res.status(400).json({ message: 'problemId, cloudinaryPublicId and secureUrl are required' });
    }

    // Verify the upload actually exists on Cloudinary.
    const resource = await cloudinary.api.resource(cloudinaryPublicId, { resource_type: 'video' });
    if (!resource) return res.status(400).json({ message: 'Video not found on Cloudinary' });

    // A problem has a single editorial: replace any previous one.
    const previous = await SolutionVideo.findOneAndDelete({ problemId });
    if (previous && previous.cloudinaryPublicId !== cloudinaryPublicId) {
      cloudinary.uploader
        .destroy(previous.cloudinaryPublicId, { resource_type: 'video', invalidate: true })
        .catch((e) => console.error('Failed to remove previous video:', e.message));
    }

    const thumbnailUrl = cloudinary.url(resource.public_id, {
      resource_type: 'video',
      format: 'jpg',
      transformation: [{ width: 640, height: 360, crop: 'fill', start_offset: 'auto' }],
      secure: true,
    });

    const videoSolution = await SolutionVideo.create({
      problemId,
      userId: req.result._id,
      cloudinaryPublicId,
      secureUrl,
      duration: resource.duration || duration || 0,
      thumbnailUrl,
    });

    res.status(201).json({
      message: 'Video solution saved successfully',
      videoSolution: {
        id: videoSolution._id,
        thumbnailUrl: videoSolution.thumbnailUrl,
        duration: videoSolution.duration,
        uploadedAt: videoSolution.createdAt,
      },
    });
  } catch (error) {
    console.error('Error saving video metadata:', error);
    res.status(500).json({ message: 'Failed to save video metadata' });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { problemId } = req.params;
    if (!mongoose.isValidObjectId(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    const video = await SolutionVideo.findOneAndDelete({ problemId });
    if (!video) return res.status(404).json({ message: 'This problem has no video' });

    await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: 'video', invalidate: true });
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
};

module.exports = { generateUploadSignature, saveVideoMetadata, deleteVideo };
