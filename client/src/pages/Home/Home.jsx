import React from 'react'
import Header from '../../components/Header/Header'
import { Link } from 'react-router-dom'
import './Home.css'
import { FaPlay } from "react-icons/fa";


export default function Home() {
  return (
    <>
    <Header/>
    <div className='home_container'>
      <div className='video_container'>
        <div className="image_container">
          <Link to={'/play'}>
            <img src="https://i.ytimg.com/vi/LHQm8mfbyHs/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLBlZ2DYIzSxO6BrbjsXiVnmVnLdOg" alt="" />
            <FaPlay className='play_icon'/>
          </Link>
        </div>
        <div className="image_container">
          <Link to={'/play'}>
          <img src="https://i.ytimg.com/vi/Kaz6rHE9rGQ/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLAyUOo-1jYstaaqwR5ICz64VwdcRw" alt="" />
            <FaPlay className='play_icon'/>
        </Link>
        </div>
        <div className="image_container">
          <Link to={'/play'}>
            <img src="https://i.ytimg.com/vi/RwZeut0yVa8/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLCVxswZwFonK8NDwGlYV85K3zCicQ" alt="" />
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
