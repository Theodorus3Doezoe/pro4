import React, { useState } from 'react';
import './Register.css'
import { FaUser, FaEyeSlash, FaEye } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import { Link, useNavigate } from 'react-router-dom'; // useNavigate voor redirect
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate(); // Hook voor navigatie

  
  //password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const [data, setData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

    const registerUser = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = data;

    try {
      // Belangrijk: als je backend op een andere poort/domein draait dan je frontend
      // (bijv. backend op localhost:5001 en frontend op localhost:3000),
      // dan moet je `withCredentials: true` meegeven zodat cookies worden meegestuurd.
      // Je backend CORS policy moet ook `AllowCredentials()` toestaan.
      const response = await axios.post('/register', {
        username,
        email,
        password,
        confirmPassword,
      }, { withCredentials: true }); // Voeg withCredentials toe

      if (response.data && response.data.message) {
        toast.success(response.data.message);
      } else {
        toast.success('Login Succesvol!');
      }

      setData({     
        username: '',
        email: '',
        password: '',
        confirmPassword: '', });

      // Optioneel: update een globale state (Context API, Redux) om aan te geven dat gebruiker is ingelogd
      // Voorbeeld: setIsLoggedIn(true);

      // Stuur gebruiker door naar bijvoorbeeld een dashboard
      navigate('/login'); // Pas de route aan naar wens

    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else if (error.request) {
        toast.error('Geen antwoord van de server. Probeer het later opnieuw.');
        console.error('Login error - no response:', error.request);
      } else {
        toast.error('Er is een fout opgetreden. Probeer het opnieuw.');
        console.error('Login error - setup:', error.message);
      }
    }
  };

    
  return (
 <div className='login-page'>
      <div className="login-container">
        <img src="./src/assets/logo_trans.png" alt="logo" id="logo1" />
              <form form onSubmit={registerUser} className='auth-form'>
                <div className="input-fields">
                  <div className="username-input">
                    <input type='text' placeholder='Gebruikersnaam' value={data.username} onChange={(e) => setData({...data, username: e.target.value})} required />
                    <FaUser className='auth-icons'/>
                  </div>
                  <div className="email-input-container username-input">
                    <input type="text" placeholder='Email' value={data.email} onChange={(e) => setData({...data, email: e.target.value})} required />
                    <IoIosMail className='auth-icons'/>
                  </div>
                  <div className="password-input">
                    <input type={showPassword ? 'text' : 'password'} placeholder='Wachtwoord' value={data.password} onChange={(e) => setData({...data, password: e.target.value})} required />
                    {showPassword ? (
                      <FaEye className='auth-icons' onClick={togglePasswordVisibility} />
                    ) : (
                      <FaEyeSlash className='auth-icons' onClick={togglePasswordVisibility} />
                    )}
                  </div>
                  <div className="confirm-input-container username-input">
                    <input type={showPassword ? 'text' : 'password'} placeholder='Bevestig wachtwoord' value={data.confirmPassword} onChange={(e) => setData({...data, confirmPassword: e.target.value})} required />
                    {showPassword}
                  </div>
                </div>
                <div>
                  <button className="auth-btn" type='submit'>Registreren</button>
                </div>
              </form>

        <div className="login-container-bottom">
          <Link className='bottom-link' to={'/login'}>Ga naar login pagina</Link>
        </div>
      </div>
    </div>
  )
}
