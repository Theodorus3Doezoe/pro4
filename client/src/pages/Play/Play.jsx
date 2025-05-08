import React from 'react'
import './Play.css'
import Youtube from 'react-youtube'

export default function Play() {
  const options = {
    height: '400',
    width: '650',
    playerVars: {
      autoplay: 1,
      controls: 1,
    }
  }

  const handleReady = (event) => {
    event.target.pauseVideo();
  };
  
  return (
    <div className='play-container'>
      <Youtube videoId='F1JcJp4u5nc' opt={options} onReady={handleReady} id="video"/>
    </div>
  )
}
