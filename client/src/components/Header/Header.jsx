import React from 'react'
import './Header.css'
import logo from "../../assets/logo_trans.png"
import profile from "../../assets/profile.png"
import { Link } from 'react-router-dom'


export default function Header() {
  return (
    <div className="header_container">
      <Link to={'/'}>
        <img class="header_img" src={logo}/>
      </Link>
      <Link to={'/profile'}>
        <img class="header_img" id="profile_img" src={profile}/>
      </Link>
    </div>
  )
}
