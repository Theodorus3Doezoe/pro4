import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import { Link } from 'react-router-dom';
import axios from 'axios'; // Importeer axios
import './Home.css';
import { FaPlay } from "react-icons/fa";

import thumbnail_1 from '../../assets/thumbnail_1.jpg';
import thumbnail_2 from '../../assets/thumbnail_2.jpg';
import thumbnail_3 from '../../assets/thumbnail_3.jpg';

const TOP_X_SCORES = 10;

export default function Home() {
  const [highscores, setHighscores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHighscores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Pas de URL aan als je API op een andere poort of host draait
        const response = await axios.get(`/api/highscores/top/${TOP_X_SCORES}`);
        setHighscores(response.data); // axios plaatst de data direct in response.data
      } catch (err) {
        console.error("Failed to fetch highscores:", err);
        if (err.response) {
          // De server heeft gereageerd met een statuscode buiten de 2xx range
          setError(err.response.data.message || `Server error: ${err.response.status}`);
        } else if (err.request) {
          // Het request is gemaakt maar er is geen respons ontvangen
          setError("Geen reactie van de server. Controleer je netwerk.");
        } else {
          // Er is iets anders misgegaan bij het opzetten van het request
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHighscores();
  }, []);

  return (
    <>
      <Header />
      <div className='home_container'>
        <div className='video_container'>
          <div className="image_container">
            <Link to={'/play'}>
              <img src={thumbnail_1} alt="Thumbnail 1" />
              <FaPlay className='play_icon' />
            </Link>
          </div>
          <div className="image_container">
            <Link to={'/play'}>
              <img src={thumbnail_2} alt="Thumbnail 2" />
              <FaPlay className='play_icon' />
            </Link>
          </div>
          <div className="image_container">
            <Link to={'/play'}>
              <img src={thumbnail_3} alt="Thumbnail 3" />
              <FaPlay className='play_icon' />
            </Link>
          </div>
        </div>
        <div className="leaderbord_container">
          <div className="leaderbord_name">
            <h1>LEADERBOARD</h1>
          </div>
          <div className="leaderbord_border">
            {isLoading && <p>Highscores worden geladen...</p>}
            {error && <p style={{ color: 'red' }}>Fout bij het laden: {error}</p>}
            {!isLoading && !error && (
              <table className='workouts-table '>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Gebruikersnaam</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {highscores.length > 0 ? (
                    highscores.map((scoreEntry, index) => (
                      <tr key={scoreEntry.username || index}>
                        <td>{index + 1}</td>
                        <td>{scoreEntry.username}</td>
                        <td>{scoreEntry.score}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">Nog geen highscores beschikbaar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}