import React from 'react'
import './Play.css'
import Youtube from 'react-youtube'
import Header from '../../components/Header/Header'
import heartIcon from '../../assets/heart-rate.png'

export default function Play() {
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
  
  return (
    <div className='play-page'>
      <Header/>
      <h1 className='score-title'>SCORE:</h1>
      
      <div className='main-content'>
        <div className='video-container'>
        <Youtube videoId='F1JcJp4u5nc' opts={options} onReady={handleReady} id="video"/>
        </div>
        <div className='side-container'>
          <div className='webcam-container'/>
          <div className='heartrate-container'>
            <img className='heart-icon' src={heartIcon} alt='Heart Icon' />
            <span className='heartrate-number'>175</span>
          </div>
        </div>
      </div>
    </div>
  )
}
