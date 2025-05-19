import React from 'react'
import './Login.css'
import { FaUser, FaEyeSlash, FaEye } from "react-icons/fa";
import { useState } from 'react';
import { Link } from 'react-router';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }
  
  return (
    <div className='login-page'>
      <div className="login-container">
        <div className="login-container-top">
          <h1 className='login-container-top-text'>Login</h1>
          <Link className='exit-login-container' to={'/'}>X</Link>
        </div>
        <div className="login-container-input">
          <div className="username-input">
            <input type='text' placeholder='Username'/>
            <FaUser className='user-icon'/>
          </div>
          <div className="password-input">
            <input type={showPassword ? 'text' : 'password'} placeholder='Password'/>
            {showPassword ? (
            <FaEye className='eye-icon' onClick={togglePasswordVisibility} />
            ) : (
            <FaEyeSlash className='eye-icon' onClick={togglePasswordVisibility} />
            )}
        </div>
        </div>
        <div className="login-container-bottom">
          <button className='sign-in-button'>Sign In</button>
          <button className='lost-password-text'>Lost your password?</button>
          <Link className='register-text' to={'/register'}>register for an account</Link>
        </div>
      </div>
    </div>
  )
}
