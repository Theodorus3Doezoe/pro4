import React from 'react'
import './Login.css'
import { FaUser, FaEyeSlash, FaEye } from "react-icons/fa";
import { useState } from 'react';
import { Link } from 'react-router';
import axios from 'axios'
import toast from 'react-hot-toast'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }
  
  const [data, setData] = useState({
    username: '',
    password: '',
  })

const loginUser = async (e) => {
  e.preventDefault();
  const { username, password } = data; // 'data' is hier je component state voor username/password

  try {
    // De 'response' variabele bevat het volledige antwoord van Axios
    // De daadwerkelijke data van de server zit in 'response.data'
    const response = await axios.post('/login', { // Zorg dat '/login' correct is voor je setup
      username,
      password,
    });

    // Als de request succesvol is (status code 2xx), komt de code hier.
    // Axios plaatst de JSON response van de server in response.data
    // Je C# backend stuurt { message: "Login successful" } bij succes.
    // Eventueel stuur je ook een token mee: { message: "...", token: "..." }

    if (response.data && response.data.message) {
      toast.success(response.data.message); // Gebruik het bericht van de backend!
    } else {
      toast.success('Login Successful!'); // Fallback als er geen bericht is
    }

    setData({ username: '', password: '' }); // Reset formulier

    // Als je backend ook een token stuurt bij succesvolle login:
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      // Hier kun je de gebruiker doorsturen, bijv.
      // window.location.href = '/dashboard';
    }

  } catch (error) {
    // Als de server een error status code stuurt (4xx of 5xx), komt de code hier.
    // Axios plaatst de error details in het 'error' object.
    // De response van de server zit dan vaak in 'error.response.data'.
    // Je C# backend stuurt bijv. { message: "Invalid password" }

    if (error.response && error.response.data && error.response.data.message) {
      // Als de server een JSON response met een 'message' property stuurt
      toast.error(error.response.data.message);
    } else if (error.request) {
      // Als het request is gemaakt maar er geen response is ontvangen
      // (bijv. server is down, netwerkprobleem)
      toast.error('No response from server. Please try again later.');
      console.error('Login error - no response:', error.request);
    } else {
      // Iets anders ging mis bij het opzetten van het request
      toast.error('An error occurred. Please try again.');
      console.error('Login error - setup:', error.message);
    }
  }
};

  return (
    <div className='login-page'>
      <div className="login-container">
        <div className="login-container-top">
          <h1 className='login-container-top-text'>Login</h1>
          <Link className='exit-login-container' to={'/'}>X</Link>
        </div>
        <div className="login-container-input">
          <form onSubmit={loginUser}>
            <div className="username-input">
              <input type='text' placeholder='Username' value={data.username} onChange={(e) => setData({...data, username: e.target.value})} />
              <FaUser className='user-icon'/>
            </div>
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} placeholder='Password' value={data.password} onChange={(e) => setData({...data, password: e.target.value})} />
              {showPassword ? (
                <FaEye className='eye-icon' onClick={togglePasswordVisibility} />
              ) : (
                <FaEyeSlash className='eye-icon' onClick={togglePasswordVisibility} />
              )}
            </div>
            <div className="login-container-bottom">
              <button type='submit' className='sign-in-button'>Sign In</button>
              <button className='lost-password-text'>Lost your password?</button>
              <Link className='register-text' to={'/register'}>register for an account</Link>
            </div>
            </form>
        </div>
      </div>
    </div>
  )
}
