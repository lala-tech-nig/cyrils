"use client";

import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import styles from '../manager/manager.module.css';

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
    <div className={styles.managerWrapper}>
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${styles.active}`}>
            <span className={styles.icon}>⏰</span> Time Clock
          </button>
        </div>
      </nav>

      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Staff Attendance</h1>
            <p className={styles.pageSubtitle}>Welcome, {user?.username}. Please log your attendance for the day.</p>
          </div>
        </header>

        <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className={styles.panel} style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: '#0f172a', marginBottom: '2rem' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            
            <button 
              onClick={handleClockToggle}
              style={{ 
                backgroundColor: clockedIn ? '#ef4444' : '#16a34a',
                color: 'white',
                border: 'none',
                padding: '1rem 3rem',
                fontSize: '1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              {clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
            </button>
          </div>

          {timeLogs.length > 0 ? (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Logs</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Time</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`${styles.badge} ${log.type === 'Clock In' ? styles.badgeGreen : styles.badgeRed}`}>
                            {log.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.time}</td>
                        <td style={{ color: '#64748b' }}>{log.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Logs</h2>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.emptyState}>No attendance records for today.</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
