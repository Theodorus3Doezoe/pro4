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
import toast from 'react-hot-toast';
import axios from 'axios';
import {useNavigate} from 'react-router-dom'

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
    referenceDistance = Math.max(videoWidth, videoHeight) / 4; 
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
  const navigate = useNavigate(); // Hook voor navigatie
  const webCamRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null);

  const [webcamPose, setWebcamPose] = useState(null);
  const [videoPose, setVideoPose] = useState(null);
  
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [heartRate, setHeartRate] = useState(null);
  const [isHrConnected, setIsHrConnected] = useState(false);
  const [hrDevice, setHrDevice] = useState(null);
  const [hrCharacteristic, setHrCharacteristic] = useState(null);
  // const [bluetoothError, setBluetoothError] = useState(null); 

  //api
  const [accumulatedPlayedSeconds, setAccumulatedPlayedSeconds] = useState(0);
  const lastPlayTimestampRef = useRef(0); // Voor nauwkeurige tijdmeting
  const animationFrameRef = useRef(null); // Voor requestAnimationFrame

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  const parseHeartRate = (value) => {
    const flags = value.getUint8(0);
    const rate16Bits = (flags & 0x1);
    let hrValue;
    if (rate16Bits) {
      hrValue = value.getUint16(1, true);
    } else {
      hrValue = value.getUint8(1);
    }
    return hrValue;
  };

  const handleHeartRateChanged = useCallback((event) => {
    const value = event.target.value;
    const newHeartRate = parseHeartRate(value);
    console.log('New Heart Rate:', newHeartRate);
    setHeartRate(newHeartRate);
  }, []); 

  // Effect 1: Model laden (draait één keer bij mount)
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        const moveNet = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        setDetector(moveNet);
        setIsDetecting(true); 
        console.log("MoveNet model loaded (dedicated effect).");
      } catch (error) {
        console.error("Error loading MoveNet model:", error);
      }
    };
    loadModel();
  }, []); // Lege dependency array

  // Effect 2: Video speelstatus bijhouden
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const handlePlay = () => setIsVideoPlaying(true);
    const handlePause = () => setIsVideoPlaying(false);
    const handleEnded = () => setIsVideoPlaying(false);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    const initialCheckTimeout = setTimeout(() => {
        if (!videoElement.paused && !videoElement.ended && videoElement.readyState >= 3) {
            setIsVideoPlaying(true);
        } else {
            setIsVideoPlaying(false);
        }
    }, 200);
    return () => {
        clearTimeout(initialCheckTimeout);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
        videoElement.removeEventListener('ended', handleEnded);
    };
  }, []); 

   // --- NIEUW EFFECT: ACCUMULEREN VAN AFGESPEELDE TIJD ---
  useEffect(() => {
    const tick = () => {
      if (isVideoPlaying) {
        const now = performance.now();
        if (lastPlayTimestampRef.current > 0) { // Zorgt ervoor dat het correct start na een pauze
          const deltaSeconds = (now - lastPlayTimestampRef.current) / 1000;
          setAccumulatedPlayedSeconds(prevSeconds => prevSeconds + deltaSeconds);
        }
        lastPlayTimestampRef.current = now; // Update voor de volgende frame
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (isVideoPlaying) {
      lastPlayTimestampRef.current = performance.now(); // Start/reset de timestamp als het spelen begint/hervat
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      lastPlayTimestampRef.current = 0; // Reset als de video niet speelt
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isVideoPlaying]); // Draait opnieuw als isVideoPlaying verandert


  // Effect 3: Bluetooth Apparaat (hrDevice) cleanup
  useEffect(() => {
    const currentDevice = hrDevice; // Leg huidige device vast voor cleanup closure
    console.log('hrDevice effect: currentDevice is', currentDevice?.id);

    return () => {
      console.log('Cleanup for hrDevice effect. Device in closure:', currentDevice?.id);
      if (currentDevice && currentDevice.gatt && currentDevice.gatt.connected) {
        console.log(`Cleaning up device ${currentDevice.id} (disconnecting).`);
        // Als dit device wordt opgeruimd, moeten ook zijn characteristic en listener worden opgeruimd.
        if (hrCharacteristic && hrCharacteristic.service.device.id === currentDevice.id) {
          console.log(`   Also cleaning up characteristic ${hrCharacteristic.uuid} for device ${currentDevice.id}`);
          try {
            if (hrCharacteristic.stopNotifications) {
              hrCharacteristic.stopNotifications().catch(e => console.warn("Cleanup (hrDevice): Error stopping notifications:", e));
            }
            hrCharacteristic.removeEventListener('characteristicvaluechanged', handleHeartRateChanged);
          } catch (e) {
            console.warn("Cleanup (hrDevice): Error with characteristic cleanup:", e);
          }
          // Overweeg setHrCharacteristic(null) hier als de characteristic specifiek bij dit device hoort
          // en niet al door een andere flow wordt gereset.
        }
        currentDevice.gatt.disconnect();
      } else if (currentDevice) {
        console.log(`Cleanup for hrDevice effect: Device ${currentDevice.id} was present but not connected.`);
      }
    };
  }, [hrDevice]); // Draait alleen als hrDevice referentie verandert (of bij unmount)

  // Effect 4: Bluetooth Characteristic (hrCharacteristic) listener management
  useEffect(() => {
    const currentCharacteristic = hrCharacteristic; // Leg huidige characteristic vast
    console.log('hrCharacteristic effect: currentCharacteristic is', currentCharacteristic?.uuid);

    if (currentCharacteristic && currentCharacteristic.service.device.gatt && currentCharacteristic.service.device.gatt.connected) { // Alleen listener toevoegen als device verbonden is
      console.log(`Adding listener to characteristic ${currentCharacteristic.uuid}`);
      currentCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRateChanged);
    }
    return () => {
      if (currentCharacteristic) {
        console.log(`Removing listener from characteristic ${currentCharacteristic.uuid}`);
        try {
          currentCharacteristic.removeEventListener('characteristicvaluechanged', handleHeartRateChanged);
          // Stop notifications hier alleen als de characteristic zelf wordt verwijderd,
          // niet per se als alleen de listener wordt verwijderd.
          // De hrDevice cleanup zou stopNotifications moeten afhandelen.
        } catch (e) {
          console.warn("Cleanup (hrCharacteristic): Error removing listener:", e);
        }
      }
    };
  }, [hrCharacteristic, handleHeartRateChanged]); // handleHeartRateChanged is stabiel

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
        const video = webCamRef.current.video; 
        const canvas = canvasRef.current;
        if (!canvas) { rafId = requestAnimationFrame(detectWebcamPose); return; }
        const ctx = canvas.getContext('2d'); 
        canvas.width = video.videoWidth; 
        canvas.height = video.videoHeight;
        try {
          const poses = await detector.estimatePoses(video, { flipHorizontal: false });
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (poses?.length > 0) {
            setWebcamPose(poses[0]);
            drawKeypoints(poses[0], ctx, false, canvas.width); 
            drawSkeleton(poses[0], ctx, false, canvas.width);
          } else { setWebcamPose(null); }
        } catch (error) { console.error('Pose estimation error (webcam):', error); setWebcamPose(null); }
      }
      rafId = requestAnimationFrame(detectWebcamPose);
    };
    detectWebcamPose(); 
    return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting, drawKeypoints, drawSkeleton]);

  useEffect(() => {
    if (!isDetecting || !detector) return; 
    let rafId;
    const videoElement = videoRef.current;
    const detectVideoElementPose = async () => {
      if (videoElement?.readyState >= 3) { 
        const canvas = videoCanvasRef.current;
        if (!canvas) { rafId = requestAnimationFrame(detectVideoElementPose); return; }
        const ctx = canvas.getContext('2d'); 
        canvas.width = videoElement.videoWidth; 
        canvas.height = videoElement.videoHeight;
        try {
          const poses = await detector.estimatePoses(videoElement, { flipHorizontal: false });
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (poses?.length > 0) {
            setVideoPose(poses[0]);
            drawKeypoints(poses[0], ctx, false); 
            drawSkeleton(poses[0], ctx, false);
          } else { setVideoPose(null); }
        } catch (error) { console.error('Pose estimation error (video element):', error); setVideoPose(null); }
      }
      rafId = requestAnimationFrame(detectVideoElementPose);
    };
    if (videoElement) { detectVideoElementPose(); }
    return () => cancelAnimationFrame(rafId);
  }, [detector, isDetecting, drawKeypoints, drawSkeleton]); 

  const calculateInstantSimilarity = useCallback((userP, refP) => {
    if (!userP || !refP || !webCamRef.current?.video || !videoRef.current) return 0;
    const webcamVideoEl = webCamRef.current.video; 
    const refVideoEl = videoRef.current;
    const normalizedUserKP = normalizeKeypoints(userP, webcamVideoEl.videoWidth, webcamVideoEl.videoHeight);
    const normalizedRefKP = normalizeKeypoints(refP, refVideoEl.videoWidth, refVideoEl.videoHeight);
    if (!normalizedUserKP || !normalizedRefKP) return 0;
    let totalDistance = 0; 
    let comparableKeypointsCount = 0;
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
    return Math.round(Math.max(0, 100 * Math.exp(-averageDistance * 2.5))); 
  }, []);

useEffect(() => {
    if (isVideoPlaying && webcamPose && videoPose) { 
      const instantaneousSimilarity = calculateInstantSimilarity(webcamPose, videoPose);
      let pointsEarned = 0;
      if (instantaneousSimilarity > 80 ) pointsEarned = 0; 
      else if (instantaneousSimilarity > 10) pointsEarned = 1;

      if (pointsEarned > 0) {
        // Update displayedScore direct
        setDisplayedScore(prevScore => prevScore + pointsEarned);
      }
    }
    // Als video niet speelt, wordt er geen score berekend of toegevoegd.
    // Als je de score wilt resetten wanneer de video stopt, kan dat in de handleEnded functie.
  }, [webcamPose, videoPose, calculateInstantSimilarity, isVideoPlaying])

    // --- NIEUWE FUNCTIE OM WORKOUT TE BEËINDIGEN EN OPGESLAGEN ---
  const handleFinishWorkout = async () => {
    // Stop de video en tijdregistratie
    if(videoRef.current) {
        videoRef.current.pause(); // Dit triggert de useEffect voor isVideoPlaying en stopt de accumulator
    }
    // Wacht even tot de state updates (isVideoPlaying, accumulatedPlayedSeconds) zijn verwerkt
    // Dit is een kleine workaround; idealiter zou je de state directer managen of de actuele waarde gebruiken.
    await new Promise(resolve => setTimeout(resolve, 100));


    if (accumulatedPlayedSeconds < 1) { // Check de geaccumuleerde tijd
        toast.error("Workout is te kort om op te slaan.");
        if(videoRef.current && videoRef.current.paused) { // Als video niet meer speelt, geef optie om te hervatten
            // videoRef.current.play(); // of toon een "hervat workout" knop
        }
        return;
    }

    const workoutData = {
        score: displayedScore,
        durationInSeconds: Math.round(accumulatedPlayedSeconds), // Gebruik geaccumuleerde tijd
        workoutDate: new Date().toISOString(), // Huidige datum/tijd in UTC
    };

    try {
        // Zorg ervoor dat je axios (of fetch) correct is geconfigureerd voor authenticatie (bijv. withCredentials: true)
        const response = await axios.post('/api/workouts', workoutData, { withCredentials: true });
        toast.success(response.data.message || "Workout succesvol opgeslagen!");
        
        // Reset states voor een eventuele nieuwe workout
        setDisplayedScore(0);
        setAccumulatedPlayedSeconds(0);
        navigate('/'); // Als je wilt navigeren
    } catch (error) {
        if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
        } else {
            toast.error('Fout bij het opslaan van de workout. Probeer opnieuw.');
        }
        console.error("Fout bij opslaan workout:", error);
    }
  };

  const handleConnectHeartRate = async () => {
    // setBluetoothError(null);
    if (!navigator.bluetooth) {
      console.warn('Web Bluetooth API is niet beschikbaar in deze browser.');
      // setBluetoothError('Web Bluetooth API is niet beschikbaar in deze browser.');
      return;
    }

    // Disconnect logic if already connected
    if (hrDevice && hrDevice.gatt && hrDevice.gatt.connected) {
      console.log('Handmatig loskoppelen gestart voor device:', hrDevice.id);
      // De useEffect voor hrDevice (die afhangt van [hrDevice]) zal de daadwerkelijke
      // loskoppeling en opruiming van characteristic afhandelen wanneer setHrDevice(null) wordt aangeroepen.
      // Hier resetten we de states, wat de cleanup effecten zal triggeren.
      try {
        // Stop notificaties direct als characteristic nog bestaat
        if (hrCharacteristic && hrCharacteristic.stopNotifications) {
            await hrCharacteristic.stopNotifications();
            console.log('Notificaties gestopt (handmatige disconnect).');
            // Listener wordt verwijderd door de hrCharacteristic useEffect cleanup
        }
      } catch (e) {
        console.warn('Fout bij stoppen notificaties tijdens handmatige disconnect:', e);
      }
      // Trigger de cleanup effecten door states te nullen
      setHrCharacteristic(null); // Eerst char, dan device
      setHrDevice(null); 
      setIsHrConnected(false);
      setHeartRate(null);
      return;
    }

    let localDevice; 
    try {
      console.log('Bluetooth-apparaat aanvragen...');
      localDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });
      console.log('Apparaat geselecteerd:', localDevice.name || localDevice.id);
      // setHrDevice(localDevice); // Wordt later gezet na succesvolle verbinding

      localDevice.addEventListener('gattserverdisconnected', () => {
        console.log(`Hartslagmeter ${localDevice?.name || localDevice?.id} onverwacht losgekoppeld.`);
        // setBluetoothError(`Apparaat ${localDevice?.name || localDevice?.id} losgekoppeld.`);
        setIsHrConnected(false);
        setHeartRate(null);
        setHrDevice(prevDevice => (prevDevice && prevDevice.id === localDevice?.id ? null : prevDevice));
        setHrCharacteristic(prevChar => (prevChar && prevChar.service.device.id === localDevice?.id ? null : prevChar));
      });

      console.log('Verbinding maken met GATT Server...');
      const server = await localDevice.gatt.connect();
      console.log('Verbonden met GATT Server.');
      if (!server.connected) throw new Error("GATT Server niet verbonden na connect().");
      
      setHrDevice(localDevice); // Nu pas hrDevice state zetten

      console.log('Heart Rate Service opvragen...');
      const service = await server.getPrimaryService('heart_rate');
      console.log('Heart Rate Service verkregen.');
      if (!server.connected) throw new Error("GATT Server verbinding verbroken voor service.");

      console.log('Heart Rate Measurement Characteristic opvragen...');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      console.log('Heart Rate Measurement Characteristic verkregen.');
      if (!server.connected) throw new Error("GATT Server verbinding verbroken voor characteristic.");
      
      setHrCharacteristic(characteristic); // Nu pas hrCharacteristic state zetten

      console.log('Notificaties starten...');
      await characteristic.startNotifications();
      console.log('Notificaties gestart.');
      // Listener wordt toegevoegd door de useEffect die afhangt van hrCharacteristic
      
      setIsHrConnected(true);
      // setBluetoothError(null); 

    } catch (error) {
      console.error('Fout bij verbinden met hartslagmeter:', error);
      console.warn(`Kon niet verbinden met hartslagmeter: ${error.message}`);
      // setBluetoothError(`Fout: ${error.message}`);
      
      if (localDevice && localDevice.gatt && localDevice.gatt.connected) {
        try { localDevice.gatt.disconnect(); } 
        catch (e) { console.error("Fout bij poging tot disconnect na error:", e); }
      }
      // Reset states om cleanup effects te triggeren indien nodig
      setHrCharacteristic(null);
      setHrDevice(null); 
      setIsHrConnected(false);
      setHeartRate(null);
    }
  };

  return (
    <div className='play-body'>
      <Header />
      <div className='play-page'>
        <div className='main-content'>

          {/* Linkerkolom: Knop "Beëindig workout" en Videospeler */}
          <div className="video-column">
            <div className="btn-container">
              <button onClick={handleFinishWorkout} className='end-workout-btn'>Beëindig workout</button>
              <button onClick={handleConnectHeartRate} className="connect-device-btn">
                <FaHeartbeat style={{ marginRight: '8px' }} />
                {isHrConnected ? `Verbonden met: ${hrDevice?.name || 'Onbekend apparaat'}` : "Verbind apparaat"}
              </button>
            </div>
            <div className='video-container'>
              <video ref={videoRef} className='video-player' controls autoPlay muted loop playsInline src={video1} />
              <canvas ref={videoCanvasRef} className='video-canvas' />
            </div>
          </div>

          {/* Rechterkolom: Stats, "Verbind apparaat" knop, en Webcam */}
          <div className='side-container'>
            <div className="side-container-top-content">
   
              <div className="stat-container">
                <div className="score-container">
                  <FaStar className='score-icon' />
                  <span className='score-number'>{displayedScore}</span>
                </div>
                <div className='heartrate-container'>
                  <img className='heart-icon' src={heartIcon} alt='Heart Icon' />
                  <span className='heartrate-number'>{heartRate !== null ? heartRate : "N/A"}</span>
                </div>
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
