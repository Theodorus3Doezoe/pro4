import React from 'react'
import './Profile.css'
import Header from '../../components/Header/Header'
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  function handleLogout() {
    navigate('/login');
  }

  return (
    <>
      <Header/>
      <div className="profile_container">
        <h1 className="profile_text" id="name">Account Details</h1>
        <h2 className="profile_text1">Beheer uw account informatie</h2>
        <h4 className="Naam" id="Naam">Naam</h4>
        <h4 className="Sven" id="text">Sven</h4>
        <h4 id="Naam">email</h4>
        <h4 id="text">Sven@gmail.com</h4>
        <hr />
        <h4 id="Naam">Lid sinds</h4>
        <h4 id="text">1 Januari, 2025</h4>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <div className='workout_container'>
        <h1 className="text_kop" id="text_kop">
          Recente Workout <span className="highscore">Highscore: 500</span>
        </h1>
        <div className="score-row">
          <h2 className="Score">Score</h2>
          <h2 className="Tijd">Tijd</h2>
          <h2 className="Datum">Datum</h2>
        </div>
        <hr id="hr2" />
        <div className="score_teksten">
          <h2 className="Score1">999</h2>
          <h2 className="Tijd1">10:15</h2>
          <h2 className="Datum1">19 Mei, 2025</h2>
        </div>
      </div>
    </>
  )
}
