"use client";

import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

export default function AttendancePage() {
  const { user } = useAppContext();
  const [clockedIn, setClockedIn] = useState(false);
  const [timeLogs, setTimeLogs] = useState([]);

  const handleClockToggle = () => {
    const now = new Date();
    
    if (!clockedIn) {
      // Clock In
      setTimeLogs([{ type: 'Clock In', time: now.toLocaleTimeString(), date: now.toLocaleDateString() }, ...timeLogs]);
      alert('Clocked In Successfully');
    } else {
      // Clock Out
      setTimeLogs([{ type: 'Clock Out', time: now.toLocaleTimeString(), date: now.toLocaleDateString() }, ...timeLogs]);
      alert('Clocked Out Successfully. Have a good rest!');
    }
    
    setClockedIn(!clockedIn);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Staff Attendance</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>
        Welcome, {user?.username}. Please log your attendance for the day.
      </p>

      <div style={{ 
        background: 'white', 
        padding: '3rem', 
        borderRadius: 'var(--radius-lg)', 
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '2rem' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        <button 
          onClick={handleClockToggle}
          style={{ 
            backgroundColor: clockedIn ? '#ef4444' : 'var(--primary-green)',
            color: 'white',
            border: 'none',
            padding: '1rem 3rem',
            fontSize: '1.5rem',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s'
          }}
        >
          {clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
        </button>
      </div>

      {timeLogs.length > 0 && (
        <div style={{ marginTop: '3rem', textAlign: 'left', background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Recent Logs</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {timeLogs.map((log, idx) => (
              <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f9f9f9', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '500', color: log.type === 'Clock In' ? 'var(--primary-green)' : '#ef4444' }}>
                  {log.type}
                </span>
                <span>{log.date} at {log.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
