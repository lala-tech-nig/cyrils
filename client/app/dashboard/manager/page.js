"use client";

import { useState } from 'react';

export default function ManagerDashboard() {
  // Mock Data
  const [stats] = useState({
    totalSales: 154000,
    ordersCount: 42,
    onlineOrders: 12,
    walkInOrders: 30,
    cashReceived: 45000,
    transferReceived: 109000
  });

  const [prRequests, setPrRequests] = useState([
    { id: 1, item: 'Fried Rice & Beef', qty: 2, value: 8000, comment: 'MD Guest', staff: 'Jane', status: 'Pending' },
  ]);

  const approvePr = (id) => {
    setPrRequests(prRequests.map(pr => pr.id === id ? { ...pr, status: 'Approved' } : pr));
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Manager Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Daily Sales</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-orange)' }}>₦{stats.totalSales.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>{stats.ordersCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cash Received</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>₦{stats.cashReceived.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Transfers/POS</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>₦{stats.transferReceived.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Pending PR (Giveaway) Approvals</h2>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '1rem 0.5rem' }}>Item</th>
              <th style={{ padding: '1rem 0.5rem' }}>Value</th>
              <th style={{ padding: '1rem 0.5rem' }}>Comment</th>
              <th style={{ padding: '1rem 0.5rem' }}>Staff</th>
              <th style={{ padding: '1rem 0.5rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {prRequests.map(pr => (
              <tr key={pr.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{pr.qty}x {pr.item}</td>
                <td style={{ padding: '1rem 0.5rem' }}>₦{pr.value}</td>
                <td style={{ padding: '1rem 0.5rem', fontStyle: 'italic', color: '#666' }}>"{pr.comment}"</td>
                <td style={{ padding: '1rem 0.5rem' }}>{pr.staff}</td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  {pr.status === 'Pending' ? (
                    <button onClick={() => approvePr(pr.id)} className="btn-secondary" style={{ padding: '0.5rem' }}>Approve</button>
                  ) : (
                    <span style={{ color: 'var(--primary-green)', fontWeight: 'bold' }}>Approved</span>
                  )}
                </td>
              </tr>
            ))}
            {prRequests.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No pending PR approvals.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
