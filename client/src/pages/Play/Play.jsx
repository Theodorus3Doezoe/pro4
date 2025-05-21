import React, { useRef, useState, useEffect, useCallback } from 'react';
import './Play-sven.css';
import Header from '../../components/Header/Header'; // Zorg dat dit pad klopt
import heartIcon from '../../assets/heart-rate.png'; // Zorg dat dit pad klopt
import { FaStar, FaHeartbeat } from 'react-icons/fa';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import video1 from '../../assets/video1.mp4'; // Zorg dat dit pad klopt

// HULPFUNCTIES (buiten de component)
const euclideanDistance = (kp1, kp2) => {
  if (typeof kp1?.x !== 'number' || typeof kp1?.y !== 'number' ||
      typeof kp2?.x !== 'number' || typeof kp2?.y !== 'number') {
    return Infinity;
  }
  return Math.sqrt(Math.pow(kp1.x - kp2.x, 2) + Math.pow(kp1.y - kp2.y, 2));
};

const normalizeKeypoints = (pose, videoWidth, videoHeight) => {
  if (!pose || !pose.keypoints || videoWidth === 0 || videoHeight === 0) {
    return null;
  }
  const kpMap = new Map(pose.keypoints.map(kp => [kp.name, kp]));
  const leftShoulder = kpMap.get('left_shoulder');
  const rightShoulder = kpMap.get('right_shoulder');
  const leftHip = kpMap.get('left_hip');
  const rightHip = kpMap.get('right_hip');

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip ||
      leftShoulder.score < 0.3 || rightShoulder.score < 0.3 ||
      leftHip.score < 0.3 || rightHip.score < 0.3) {
    return pose.keypoints.map(kp => ({
        ...kp,
        x_norm: kp.x / videoWidth,
        y_norm: kp.y / videoHeight
    }));
  }
  const hipMidPointX = (leftHip.x + rightHip.x) / 2;
  const hipMidPointY = (leftHip.y + rightHip.y) / 2;
  let referenceDistance = euclideanDistance(leftShoulder, rightShoulder);
  if (referenceDistance < 1e-3) {
    referenceDistance = videoWidth / 4;
  }
  return pose.keypoints.map(kp => {
    if (kp.score > 0.3) {
      return {
        ...kp,
        x_norm: (kp.x - hipMidPointX) / referenceDistance,
        y_norm: (kp.y - hipMidPointY) / referenceDistance,
      };
    }
    return { ...kp, x_norm: null, y_norm: null };
  });
};

export default function Play() {
  const webCamRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null);

  const [webcamPose, setWebcamPose] = useState(null);
  const [videoPose, setVideoPose] = useState(null);
  const [cumulativeScore, setCumulativeScore] = useState(0);

  const [heartRate, setHeartRate] = useState(null);
  const [isHrConnected, setIsHrConnected] = useState(false);
  const [hrDevice, setHrDevice] = useState(null); // Sla het Bluetooth-apparaat op
  const [hrCharacteristic, setHrCharacteristic] = useState(null); // Sla de characteristic op

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  // Functie om hartslagdata te parsen
  const parseHeartRate = (value) => {
    // value is een DataView object
    const flags = value.getUint8(0);
    const rate16Bits = (flags & 0x1); // Check of hartslag 8 of 16 bits is
    let hrValue;
    if (rate16Bits) {
      hrValue = value.getUint16(1, true); // true voor little-endian
    } else {
      hrValue = value.getUint8(1);
    }
    return hrValue;
  };

  // Event handler voor hartslag updates
  const handleHeartRateChanged = useCallback((event) => {
    const value = event.target.value;
    const newHeartRate = parseHeartRate(value);
    console.log('New Heart Rate:', newHeartRate);
    setHeartRate(newHeartRate);
  }, []);


  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const moveNet = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        setDetector(moveNet);
        setIsDetecting(true);
      } catch (error) {
        console.error("Error loading MoveNet model:", error);
      }
    };
    loadModel();

    // Cleanup bij unmount
    return () => {
      if (hrDevice && hrDevice.gatt.connected) {
        console.log('Disconnecting from HR device on component unmount...');
        hrDevice.gatt.disconnect();
      }
      if (hrCharacteristic) {
         // Verwijder event listener als de characteristic nog bestaat
        hrCharacteristic.removeEventListener('characteristicvaluechanged', handleHeartRateChanged);
      }
    };
  }, [hrDevice, hrCharacteristic, handleHeartRateChanged]); // hrCharacteristic en handleHeartRateChanged toegevoegd

  const drawKeypoints = useCallback((pose, ctx, isMirrored = false, canvasWidth = 0) => {
    if (!pose || !pose.keypoints) return;
    for (const keypoint of pose.keypoints) {
      let { name, x, y, score } = keypoint;
      const skip = ['left_eye', 'right_eye', 'left_ear', 'right_ear'];
      if (score > 0.3 && (!skip.includes(name) || name === 'nose')) {
        if (isMirrored) x = canvasWidth - x;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = 'red'; ctx.fill();
      }
    }
  }, []);

  const drawSkeleton = useCallback((pose, ctx, isMirrored = false, canvasWidth = 0) => {
    if (!pose || !pose.keypoints) return;
    const connections = [
      ['nose', 'left_shoulder'], ['nose', 'right_shoulder'], ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'], ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'], ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle'],
    ];
    const keypointMap = new Map();
    pose.keypoints.forEach(keypoint => keypointMap.set(keypoint.name, keypoint));
    ctx.strokeStyle = 'green'; ctx.lineWidth = 4;
    for (const [p1Name, p2Name] of connections) {
      const p1 = keypointMap.get(p1Name); const p2 = keypointMap.get(p2Name);
      if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
        let p1x = p1.x; let p2x = p2.x;
        if (isMirrored) { p1x = canvasWidth - p1.x; p2x = canvasWidth - p2.x; }
        ctx.beginPath(); ctx.moveTo(p1x, p1.y); ctx.lineTo(p2x, p2.y); ctx.stroke();
      }
    }
  }, []);

  useEffect(() => {
    if (!isDetecting || !detector) return;
    let rafId;
    const detectWebcamPose = async () => {
      if (webCamRef.current?.video?.readyState === 4) {
        const video = webCamRef.current.video; const canvas = canvasRef.current;
        if (!canvas) { rafId = requestAnimationFrame(detectWebcamPose); return; }
        const ctx = canvas.getContext('2d'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        try {
          const poses = await detector.estimatePoses(video, { flipHorizontal: false });
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (poses?.length > 0) {
            setWebcamPose(poses[0]);
            drawKeypoints(poses[0], ctx, true, canvas.width); drawSkeleton(poses[0], ctx, true, canvas.width);
          } else { setWebcamPose(null); }
        } catch (error) { console.error('Pose estimation error (webcam):', error); setWebcamPose(null); }
      }
      rafId = requestAnimationFrame(detectWebcamPose);
    };
    detectWebcamPose(); return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting, drawKeypoints, drawSkeleton]);

  useEffect(() => {
    if (!isDetecting || !detector) return;
    let rafId;
    const detectVideoElementPose = async () => {
      if (videoRef.current?.readyState >= 3) {
        const video = videoRef.current; const canvas = videoCanvasRef.current;
        if (!canvas) { rafId = requestAnimationFrame(detectVideoElementPose); return; }
        const ctx = canvas.getContext('2d'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        try {
          const poses = await detector.estimatePoses(video, { flipHorizontal: false });
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (poses?.length > 0) {
            setVideoPose(poses[0]);
            drawKeypoints(poses[0], ctx, false); drawSkeleton(poses[0], ctx, false);
          } else { setVideoPose(null); }
        } catch (error) { console.error('Pose estimation error (video element):', error); setVideoPose(null); }
      }
      rafId = requestAnimationFrame(detectVideoElementPose);
    };
    const videoElement = videoRef.current;
    if (videoElement) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(detectVideoElementPose).catch(error => {
          console.warn("Video play was prevented:", error); detectVideoElementPose();
        });
      } else { detectVideoElementPose(); }
    }
    return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting, drawKeypoints, drawSkeleton]);

  const calculateInstantSimilarity = useCallback((userP, refP) => {
    if (!userP || !refP || !webCamRef.current?.video || !videoRef.current) return 0;
    const webcamVideoEl = webCamRef.current.video; const refVideoEl = videoRef.current;
    const normalizedUserKP = normalizeKeypoints(userP, webcamVideoEl.videoWidth, webcamVideoEl.videoHeight);
    const normalizedRefKP = normalizeKeypoints(refP, refVideoEl.videoWidth, refVideoEl.videoHeight);
    if (!normalizedUserKP || !normalizedRefKP) return 0;
    let totalDistance = 0; let comparableKeypointsCount = 0;
    const userKpMap = new Map(normalizedUserKP.filter(kp => kp.x_norm !== null && kp.y_norm !== null).map(kp => [kp.name, kp]));
    const keypointsToCompare = [
        'nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
        'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ];
    for (const kpName of keypointsToCompare) {
      const refKp = normalizedRefKP.find(kp => kp.name === kpName && kp.x_norm !== null && kp.y_norm !== null);
      const userKp = userKpMap.get(kpName);
      if (refKp && userKp) {
        const dist = euclideanDistance({ x: userKp.x_norm, y: userKp.y_norm }, { x: refKp.x_norm, y: refKp.y_norm });
        if (isFinite(dist)) { totalDistance += dist; comparableKeypointsCount++; }
      }
    }
    if (comparableKeypointsCount === 0) return 0;
    const averageDistance = totalDistance / comparableKeypointsCount;
    return Math.round(Math.max(0, 100 * Math.exp(-averageDistance * 3)));
  }, []);

  useEffect(() => {
    if (webcamPose && videoPose) {
      const instantaneousSimilarity = calculateInstantSimilarity(webcamPose, videoPose);
      let pointsEarned = 0;
      if (instantaneousSimilarity > 60) pointsEarned = 10;
      else if (instantaneousSimilarity > 50) pointsEarned = 8;
      else if (instantaneousSimilarity > 40) pointsEarned = 6;
      else if (instantaneousSimilarity > 30) pointsEarned = 4;
      else if (instantaneousSimilarity > 20) pointsEarned = 2;
      else if (instantaneousSimilarity > 10) pointsEarned = 1;
      if (pointsEarned > 0) setCumulativeScore(prevScore => prevScore + pointsEarned);
    }
  }, [webcamPose, videoPose, calculateInstantSimilarity]);

  const handleConnectHeartRate = async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API is niet beschikbaar in deze browser.');
      return;
    }

    if (hrDevice && hrDevice.gatt.connected) {
      console.log('Verbinding met hartslagmeter verbreken...');
      try {
        if (hrCharacteristic) {
          await hrCharacteristic.stopNotifications();
          hrCharacteristic.removeEventListener('characteristicvaluechanged', handleHeartRateChanged);
          console.log('Notificaties gestopt en listener verwijderd.');
          setHrCharacteristic(null);
        }
        hrDevice.gatt.disconnect();
        console.log('Apparaat losgekoppeld.');
        setIsHrConnected(false);
        setHeartRate(null);
        setHrDevice(null);
      } catch (error) {
        console.error('Fout bij loskoppelen:', error);
        // Reset states ook bij fout
        setIsHrConnected(false);
        setHeartRate(null);
        setHrDevice(null);
        setHrCharacteristic(null);
      }
      return;
    }

    try {
      console.log('Bluetooth-apparaat aanvragen...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        // optionalServices: [...] // indien nodig voor andere data
      });
      console.log('Apparaat geselecteerd:', device.name || device.id);
      setHrDevice(device);

      device.addEventListener('gattserverdisconnected', () => {
        console.log('Hartslagmeter onverwacht losgekoppeld.');
        setIsHrConnected(false);
        setHeartRate(null);
        setHrDevice(null);
        if (hrCharacteristic) {
            hrCharacteristic.removeEventListener('characteristicvaluechanged', handleHeartRateChanged);
            setHrCharacteristic(null);
        }
      });

      console.log('Verbinding maken met GATT Server...');
      const server = await device.gatt.connect();
      console.log('Verbonden met GATT Server.');

      console.log('Heart Rate Service opvragen...');
      const service = await server.getPrimaryService('heart_rate');
      console.log('Heart Rate Service verkregen.');

      console.log('Heart Rate Measurement Characteristic opvragen...');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      console.log('Heart Rate Measurement Characteristic verkregen.');
      setHrCharacteristic(characteristic); // Sla characteristic op

      console.log('Notificaties starten...');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChanged);
      console.log('Notificaties gestart. Wachten op hartslagdata...');
      setIsHrConnected(true);

    } catch (error) {
      console.error('Fout bij verbinden met hartslagmeter:', error);
      alert(`Kon niet verbinden met hartslagmeter: ${error.message}`);
      setIsHrConnected(false);
      setHeartRate(null);
      setHrDevice(null);
      setHrCharacteristic(null);
    }
  };

  return (
    <div className='play-body'>
      <Header />
      <div className='play-page'>
        <div className="connect-hr-container">
          <button onClick={handleConnectHeartRate} className="connect-hr-button">
            <FaHeartbeat style={{ marginRight: '8px' }} />
            {isHrConnected ? `Verbonden: ${hrDevice?.name || 'Apparaat'}` : "Verbind Hartslagmeter"}
          </button>
        </div>
        <div className='main-content'>
          <div className='video-container'>
            <video ref={videoRef} className='video-player' controls autoPlay muted loop playsInline src={video1} />
            <canvas ref={videoCanvasRef} className='video-canvas' />
          </div>
          <div className='side-container'>
            <div className="stat-container">
              <div className="score-container">
                <FaStar className='score-icon' />
                <span className='score-number'>{cumulativeScore}</span>
              </div>
              <div className='heartrate-container'>
                <img className='heart-icon' src={heartIcon} alt='Heart Icon' />
                <span className='heartrate-number'>{heartRate !== null ? heartRate : "N/A"}</span>
              </div>
            </div>
            <div className='webcam-container'>
              <Webcam ref={webCamRef} className='webcam' audio={false} videoConstraints={videoConstraints} mirrored={false} playsInline />
              <canvas ref={canvasRef} className='webcam-canvas' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
