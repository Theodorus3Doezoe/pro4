import React from 'react'
import './Workout.css'

export default function Workout() {
  return (
    <div className='workout-row-container'> 
      <div className="workout-row-text-container">
          <h2 className="score">999</h2>
          <h2 className="tijd">10:15</h2>
          <h2 className="datum">19 Mei, 2025</h2>
      </div>
        <hr className='workout-row-line'/>
    </div>
  )
}
