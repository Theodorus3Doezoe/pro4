import React from 'react'
import './Profile.css'
import Header from '../../components/Header/Header'
import placeholder from '../../assets/placeholder.jpg'

export default function Profile() {
  return (
    <>
      <Header/>
      <div className='home_container'>
        <div className="profile_container">
          <img src={placeholder} alt="" id="profile_image" />
          <h2 className="profile_text" id="name">Alex</h2>
          <h2 className="profile_text" id="score_text">Score: <span id="score">99999</span></h2>
        </div>
      </div>
    </>
  )
}

