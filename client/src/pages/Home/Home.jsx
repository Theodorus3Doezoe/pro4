import React from 'react'
import Header from '../../components/Header/Header'
import { Link } from 'react-router-dom'
import './Home.css'
import { FaPlay } from "react-icons/fa";

import thumbnail_1 from '../../assets/thumbnail_1.jpg'
import thumbnail_2 from '../../assets/thumbnail_2.jpg'
import thumbnail_3 from '../../assets/thumbnail_3.jpg'

export default function Home() {
  return (
    <>
    <Header/>
    <div className='home_container'>
      <div className='video_container'>
        <div className="image_container">
          <Link to={'/play'}>
            <img src={thumbnail_1} alt="" srcset="" />
            <FaPlay className='play_icon'/>
          </Link>
        </div>
        <div className="image_container">
          <Link to={'/play'}>
            <img src={thumbnail_2} alt="" srcset="" />
            <FaPlay className='play_icon'/>
        </Link>
        </div>
        <div className="image_container">
          <Link to={'/play'}>
            <img src={thumbnail_3} alt="" srcset="" />
            <FaPlay className='play_icon'/>
          </Link>
        </div>
      </div> 
      <div className="leaderbord_container">
        <div className="leaderbord_name">
          <h1>LEADERBORD</h1>
        </div>
        <div className="leaderbord_border">

        </div>

      </div>
      
    </div>
    </>
  )
}
