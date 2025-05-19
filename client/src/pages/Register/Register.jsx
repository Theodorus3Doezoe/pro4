import React from 'react'
import './Register.css'
import { FaUser, FaEyeSlash, FaEye } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import { useState } from 'react';
import validator from 'validator';
import { Link } from 'react-router';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  //password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  //validate email
  const validateEmail = (e) => {
	  const email = e.target.value;

    if (validator.isEmail(email)) {
      setEmailError("");
    } else {
      setEmailError("Enter a valid Email");
    }
  }

  //confirm password
  const PasswordChange = (e) => {
    setPassword(e.target.value);
    setPasswordError('')
  }

  const ConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if(password && value !== password) {
      setPasswordError ('Passwords do not match');
    }
    else {
      setPasswordError('');
    }
  }

  const Register = () => {
    if(password != confirmPassword) {
      setPasswordError('Passwords do not match');
    }
    else {
      setPasswordError('')
    }
  }
    
  return (
    <div className='register-page'>
      <div className="register-container">
        <div className="register-container-top">
          <h1 className='register-container-top-text'>Register</h1>
          <Link className='exit-register-container' to={'/'}>X</Link>
        </div>
        <div className="register-container-input">
          <div className="email-input">
            <input type="text" placeholder='Email' id='userEmail' onChange={validateEmail}/>
            <IoIosMail className='mail-icon'/>
            {emailError && (
              <span className='valid-email'>
                {emailError}
              </span>
            )}
          </div>
          <div className="username-input">
            <input type='text' placeholder='Username'/>
            <FaUser className='user-icon'/>
          </div>
          <div className="password-input">
            <input type={showPassword ? 'text' : 'password'} placeholder='Password' onChange={PasswordChange}/>
            {showPassword ? (
            <FaEye className='eye-icon' onClick={togglePasswordVisibility} />
            ) : (
            <FaEyeSlash className='eye-icon' onClick={togglePasswordVisibility} />
            )}
          </div>
          <div className="password-input">
            <input type={showConfirmPassword ? 'text' : 'password'} placeholder='Confirm Password' onChange={ConfirmPasswordChange}/>
            {showConfirmPassword ? (
            <FaEye className='eye-icon' onClick={toggleConfirmPasswordVisibility} />
            ) : (
            <FaEyeSlash className='eye-icon' onClick={toggleConfirmPasswordVisibility} />
            )}
            {passwordError && (
              <span className='valid-password'>
                {passwordError}
              </span>
            )}
          </div>
        </div>
        <div className="register-container-bottom">
          <button className='register-button'>Register</button>
          <Link className='login-text' to={'/login'}> Already have an account? </Link>
        </div>
      </div>
    </div>
  )
}
