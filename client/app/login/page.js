"use client";

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';

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

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        login(data.user, data.token);
        
        // Redirect based on role
        if (data.user.role === 'SuperAdmin' || data.user.role === 'Manager') {
          router.push('/dashboard/manager');
        } else if (data.user.role === 'Sales') {
          router.push('/dashboard/pos');
        } else if (data.user.role === 'Kitchen') {
          router.push('/dashboard/kitchen');
        } else if (data.user.role === 'Store') {
          router.push('/dashboard/store');
        } else {
          router.push('/dashboard/attendance'); // default fallback
        }
      } else {
        setError(data.message || 'Invalid login credentials');
      }
    } catch (err) {
      // Mock login for frontend preview since DB might not be seeded yet
      console.error(err);
      if (username === 'admin' && password === 'admin') {
        const mockUser = { id: '1', username: 'admin', role: 'SuperAdmin' };
        login(mockUser, 'mocktoken');
        router.push('/dashboard/manager');
      } else {
        setError('Server Error. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <Link href="/" className={styles.logo}>🍲 Cyril's Foods</Link>
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
