import React from 'react'
import Header from '../../components/Header/Header'
import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  return (
    <div className='home_container'>
      <Header/>
      <div className='video_container'>
        <Link to={'/play'}>
          <img src="https://i.ytimg.com/vi/LHQm8mfbyHs/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLBlZ2DYIzSxO6BrbjsXiVnmVnLdOg" alt="" />
          </Link>

        <Link to={'/play'}>
          <img src="https://i.ytimg.com/vi/Kaz6rHE9rGQ/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLAyUOo-1jYstaaqwR5ICz64VwdcRw" alt="" />
        </Link>

        <Link to={'/play'}>
          <img src="https://i.ytimg.com/vi/RwZeut0yVa8/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLCVxswZwFonK8NDwGlYV85K3zCicQ" alt="" />
        </Link>

        <Link to={'/play'}>
          <img src="https://i.ytimg.com/vi/oNRf5JJzltI/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLBpcAiWcfiHWyboS9uXwnyePFbowQ" alt="" />
        </Link>
      </div>
    </div>
  )
}
