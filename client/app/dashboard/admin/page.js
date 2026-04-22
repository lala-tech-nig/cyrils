"use client";

import { useState } from 'react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([
    { id: 1, username: 'admin', role: 'SuperAdmin', active: true },
    { id: 2, username: 'manager1', role: 'Manager', active: true },
    { id: 3, username: 'sales_jane', role: 'Sales', active: true },
    { id: 4, username: 'kitchen_john', role: 'Kitchen', active: true },
    { id: 5, username: 'store_mike', role: 'Store', active: true },
  ]);

  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Sales' });

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setUsers([...users, { id: Date.now(), username: newUser.username, role: newUser.role, active: true }]);
    setNewUser({ username: '', password: '', role: 'Sales' });
    alert('User created successfully');
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Super Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Create User Form */}
        <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Create New Staff</h2>
          
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Username</label>
              <input 
                type="text" 
                required
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Password</label>
              <input 
                type="password" 
                required
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Role</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Manager">Manager</option>
                <option value="Sales">Sales</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Store">Store</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Create Account</button>
          </form>
        </div>

        {/* User List */}
        <div style={{ flex: 2, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Manage Staff</h2>
          
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Username</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: u.active ? 1 : 0.5 }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{u.username}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{u.role}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ color: u.active ? 'var(--primary-green)' : '#ef4444', fontWeight: 'bold' }}>
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {u.role !== 'SuperAdmin' && (
                      <button 
                        onClick={() => toggleUserStatus(u.id)}
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '4px', 
                          border: 'none', 
                          background: u.active ? '#fee2e2' : '#dcfce7',
                          color: u.active ? '#ef4444' : '#166534',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
