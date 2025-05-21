import './Profile.css'
import Header from '../../components/Header/Header'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Workout from '../../components/Workout/Workout';

const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

// Hulpfunctie om datum mooi te formatteren
const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    try {
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
        return "Ongeldige datum";
    }
};


export default function Profile() {
 const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [error, setError] = useState(null);
  

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // `withCredentials: true` is cruciaal als je frontend en backend op verschillende origins draaien.
        const response = await axios.get('/api/me', { withCredentials: true });
        setUserData(response.data);
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          toast.error('Sessie verlopen of niet geautoriseerd. Log opnieuw in.');
          navigate('/login'); // Stuur terug naar login
        } else {
          toast.error('Kon gebruikersdata niet ophalen.');
          console.error("Error fetching user data:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post('/logout', {}, { withCredentials: true }); // Stuur leeg object als body als nodig, en withCredentials
      toast.success('Succesvol uitgelogd');
      setUserData(null); // Wis gebruikersdata uit state
      // Optioneel: update globale state (setIsLoggedIn(false))
      navigate('/login');
    } catch (error) {
      toast.error('Uitloggen mislukt.');
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
        const fetchUserWorkouts = async () => {
            setLoading(true);
            setError(null);
            try {
                // Gebruik withCredentials: true als je cookie-gebaseerde authenticatie hebt
                const response = await axios.get('/api/workouts/my', { withCredentials: true });
                setWorkouts(response.data);
            } catch (err) {
                console.error("Fout bij ophalen workouts:", err);
                const errorMessage = err.response?.data?.message || "Kon workouts niet laden.";
                setError(errorMessage);
                toast.error(errorMessage);
                if (err.response?.status === 401) {
                     // Optioneel: stuur gebruiker naar login pagina
                     // navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserWorkouts();
    }, []); // Lege dependency array: draait één keer als de component mount

  if (loading) {
    return <p>Gebruikersdata laden...</p>;
  }

  if (!userData) {
    // Dit kan ook betekenen dat de gebruiker niet is ingelogd en al is teruggestuurd
    // of dat er een fout was. De error toast zou al getoond moeten zijn.
    return <p>Geen gebruikersdata beschikbaar. Mogelijk ben je niet ingelogd.</p>;
  }
  return (
    <>
      <Header/>
      <div className="profile_container">
        <h1 className="profile_text" id="name">Account Details</h1>
        <h2 className="profile_text1">Beheer uw account informatie</h2>
        <h4 className="Naam" id="Naam">Naam</h4>
        <h4 className="Sven" id="text">{userData.username}</h4>
        <h4 id="Naam">email</h4>
        <h4 id="text">{userData.email}</h4>
        <hr />
        <h4 id="Naam">Lid sinds</h4>
        <h4 id="text">{userData.dateJoined}</h4>
        <button onClick={handleLogout} className='logout-button'>Logout</button>
      </div>
      <div className='workout_container'>
        <div className="workout-history-container">
            <h2>Mijn Recente Workouts</h2>
            {workouts.length === 0 ? (
                <p>Je hebt nog geen workouts voltooid om weer te geven.</p>
            ) : (
                <table className="workouts-table">
                    <thead>
                        <tr>
                            <th>Datum</th>
                            <th>Score</th>
                            <th>Duur</th>
                            {/* Voeg hier eventueel meer headers toe */}
                        </tr>
                    </thead>
                    <tbody>
                        {workouts.map(workout => (
                            <tr key={workout.id}>
                                <td>{formatDate(workout.workoutDate)}</td>
                                <td>{workout.score}</td>
                                <td>{formatDuration(workout.durationInSeconds)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </>
  )
}
