import React from 'react'
import './Profile.css'
import Header from '../../components/Header/Header'

export default function Profile() {
  return (
    <>
      <Header/>
      <div className='home_container'>
        <div className='video_container'>
          <div className="image_container"></div>
        </div>
        <div className="profile_picture">
        </div>
      </div>
    </>
  )
}

