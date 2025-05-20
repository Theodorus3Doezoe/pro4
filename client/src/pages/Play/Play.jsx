import React, { useRef, useState, useEffect } from 'react';
import './Play.css';
import Header from '../../components/Header/Header';
import heartIcon from '../../assets/heart-rate.png';
import { FaStar } from 'react-icons/fa';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import video1 from '../../assets/video1.mp4';

export default function Play() {
  const webCamRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  // Load MoveNet model
  useEffect(() => {
    const load = async () => {
      await tf.setBackend('webgl');
      await tf.ready();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };

      const moveNet = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      setDetector(moveNet);
      setIsDetecting(true);
    };

    load();
  }, []);

  // Pose detection for webcam
  useEffect(() => {
    let rafId;

    const detectPose = async () => {
      if (
        !isDetecting ||
        !detector ||
        !webCamRef.current ||
        webCamRef.current.video.readyState !== 4
      ) {
        rafId = requestAnimationFrame(detectPose);
        return;
      }

      const video = webCamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        poses.forEach((pose) => {
          drawKeypoints(pose, ctx);
          drawSkeleton(pose, ctx);
        });
      } catch (error) {
        console.error('Pose estimation error (webcam):', error);
      }

      rafId = requestAnimationFrame(detectPose);
    };

    if (isDetecting) detectPose();

    return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting]);

  // Pose detection for video
  useEffect(() => {
    let rafId;

    const detectVideoPose = async () => {
      if (
        !isDetecting ||
        !detector ||
        !videoRef.current ||
        videoRef.current.readyState !== 4
      ) {
        rafId = requestAnimationFrame(detectVideoPose);
        return;
      }

      const video = videoRef.current;
      const canvas = videoCanvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        poses.forEach((pose) => {
          drawKeypoints(pose, ctx);
          drawSkeleton(pose, ctx);
        });
      } catch (error) {
        console.error('Pose estimation error (video):', error);
      }

      rafId = requestAnimationFrame(detectVideoPose);
    };

    if (isDetecting) detectVideoPose();

    return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting]);

  // Draw keypoints
  const drawKeypoints = (pose, ctx) => {
    for (const keypoint of pose.keypoints) {
      const { name, x, y, score } = keypoint;
      const skip = ['left_eye', 'right_eye', 'left_ear', 'right_ear'];

      if (score > 0.3 && (!skip.includes(name) || name === 'nose')) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(name, x + 10, y + 5);
      }
    }
  };

  // Draw skeleton
  const drawSkeleton = (pose, ctx) => {
    const connections = [
      ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle'],
    ];

    const keypointMap = {};
    pose.keypoints.forEach((keypoint) => {
      keypointMap[keypoint.name] = keypoint;
    });

    ctx.strokeStyle = 'green';
    ctx.lineWidth = 4;

    for (const [p1Name, p2Name] of connections) {
      const p1 = keypointMap[p1Name];
      const p2 = keypointMap[p2Name];

      if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  };

  return (
    <div className='play-body'>
      <Header />
      <div className='play-page'>
        <div className='main-content'>
          <div className='video-container'>
            <video
              ref={videoRef}
              className='video-player'
              controls
              autoPlay
              muted
              loop
              src={video1}
              />
            <canvas ref={videoCanvasRef} className='video-canvas' />
          </div>
          <div className='side-container'>
            <div className="score-container">
              <FaStar className='score-icon' />
              <h1 className='score-number'>999</h1>
            </div>
            <div className='heartrate-container'>
              <img className='heart-icon' src={heartIcon} alt='Heart Icon' />
              <span className='heartrate-number'>999</span>
            </div>
            <div className='webcam-container'>
              <Webcam
                ref={webCamRef}
                className='webcam'
                audio={false}
                screenshotFormat='image/jpeg'
                videoConstraints={videoConstraints}
                />
              <canvas ref={canvasRef} className='webcam-canvas' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}