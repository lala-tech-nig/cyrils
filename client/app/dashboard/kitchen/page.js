"use client";

import { useState } from 'react';

export default function KitchenDashboard() {
  const [tasks, setTasks] = useState([
    { id: 1, item: 'Rice', qtyReceived: '2 Bags', expectedPortions: 100, status: 'Pending' },
    { id: 2, item: 'Chicken', qtyReceived: '1 Carton', expectedPortions: 40, status: 'In Progress' }
  ]);

  const updateStatus = (id, newStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (newStatus === 'Completed') {
      alert('Food transferred to POS Sales successfully!');
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Kitchen Dashboard</h1>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Preparation Tasks</h2>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Raw Material Received</th>
              <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
              <th style={{ padding: '1rem 0.5rem' }}>Expected Output (Portions)</th>
              <th style={{ padding: '1rem 0.5rem' }}>Status</th>
              <th style={{ padding: '1rem 0.5rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{task.item}</td>
                <td style={{ padding: '1rem 0.5rem' }}>{task.qtyReceived}</td>
                <td style={{ padding: '1rem 0.5rem', color: 'var(--primary-orange)', fontWeight: 'bold' }}>{task.expectedPortions}</td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.875rem',
                    backgroundColor: task.status === 'Completed' ? '#dcfce7' : task.status === 'In Progress' ? '#fef08a' : '#f3f4f6',
                    color: task.status === 'Completed' ? '#166534' : task.status === 'In Progress' ? '#854d0e' : '#374151'
                  }}>
                    {task.status}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  {task.status === 'Pending' && (
                    <button onClick={() => updateStatus(task.id, 'In Progress')} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>Start Prep</button>
                  )}
                  {task.status === 'In Progress' && (
                    <button onClick={() => updateStatus(task.id, 'Completed')} className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>Finish & Transfer to POS</button>
                  )}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No pending kitchen tasks.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
