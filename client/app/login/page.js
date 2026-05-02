"use client";

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';

import api from '../../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAppContext();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 1. Get Location
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        // 2. Perform Auth Login
        const loginRes = await api.post('/auth/login', { username, password });
        const loginData = loginRes.data;

        // 3. Perform Attendance Check-in (Geofencing is handled on server side)
        try {
          await api.post('/attendance/check-in', { lat: latitude, lng: longitude }, {
            headers: { Authorization: `Bearer ${loginData.token}` }
          });
        } catch (attErr) {
          setError(attErr.response?.data?.message || 'Attendance Check-in Failed');
          setIsLoading(false);
          return;
        }

        login(loginData.user, loginData.token);
          
        // Redirect based on role
        if (loginData.user.role === 'SuperAdmin' || loginData.user.role === 'Manager') {
          router.push('/dashboard/manager');
        } else if (loginData.user.role === 'Sales') {
          router.push('/dashboard/pos');
        } else if (loginData.user.role === 'Kitchen') {
          router.push('/dashboard/kitchen');
        } else if (loginData.user.role === 'Store') {
          router.push('/dashboard/store');
        } else {
          router.push('/dashboard/attendance');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Server Error. Try again.');
      } finally {
        setIsLoading(false);
      }
    }, (err) => {
      setError('Please enable location access to log in.');
      setIsLoading(false);
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <Link href="/" className={styles.logo}>
          <img src="/logo.png" alt="Cyril's Foods Logo" style={{ width: '150px', marginBottom: '1rem' }} />
        </Link>
        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label>Username</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter your username"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
            />
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
