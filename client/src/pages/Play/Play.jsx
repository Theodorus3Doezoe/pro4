import React from 'react'
import './Play.css'
import Youtube from 'react-youtube'
import Header from '../../components/Header/Header'
import heartIcon from '../../assets/heart-rate.png'
import { FaUser } from "react-icons/fa"
import Webcam from "react-webcam"
import tf from "@tensorflow/tfjs"
import PoseDetection from "@tensorflow-models/pose-detection"

export default function Play() {
  
  //Main video
  const options = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
    }
  }

  const handleReady = (event) => {
    event.target.pauseVideo();
  };

  //Webcam video
  const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user"
  };
  
  return (
    <div className='play-page'>
      <Header/>
      <h1 className='score-title'>SCORE:</h1>
        <div className='main-content'>
        <div className='video-container'>
        <Youtube videoId='F1JcJp4u5nc' opts={options} onReady={handleReady} id="video"/>
        </div>
        <div className='side-container'>
          <div className='webcam-container'>
            <Webcam className='webcam'
              audio={false}
              screenshotFormat="image/jpeg"
              height={250}
            />
          </div>
          <div className='heartrate-container'>
            <img className='heart-icon' src={heartIcon} alt='Heart Icon' />
            <span className='heartrate-number'>175</span>
          </div>
        </div>
      </div>
    </div>
  )
}
