"use client";

import { useState } from 'react';
import styles from '../layout.module.css';
import { useToast } from '../../../context/ToastContext';

export default function StoreDashboard() {
  const toast = useToast();
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Rice', unit: 'Bag', qty: 10, cost: 80000 },
    { id: 2, name: 'Beans', unit: 'Derica', qty: 50, cost: 1500 },
    { id: 3, name: 'Chicken', unit: 'Carton', qty: 5, cost: 35000 },
  ]);

  const [issueForm, setIssueForm] = useState({ item: '', qty: '', portions: '' });

  const handleIssue = (e) => {
    e.preventDefault();
    if (!issueForm.item || !issueForm.qty || !issueForm.portions) return;
    
    toast.success(`Issued ${issueForm.qty} units of ${issueForm.item} to Kitchen.`);
    // Here we would call the backend to update inventory and create a Kitchen task
    setIssueForm({ item: '', qty: '', portions: '' });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Store Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Current Inventory</h2>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '0.5rem' }}>Item</th>
                <th style={{ padding: '0.5rem' }}>Unit</th>
                <th style={{ padding: '0.5rem' }}>Qty in Stock</th>
                <th style={{ padding: '0.5rem' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{item.name}</td>
                  <td style={{ padding: '0.5rem' }}>{item.unit}</td>
                  <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{item.qty}</td>
                  <td style={{ padding: '0.5rem' }}>₦{item.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Issue to Kitchen</h2>
          <form onSubmit={handleIssue} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Select Item</label>
              <select 
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={issueForm.item}
                onChange={e => setIssueForm({...issueForm, item: e.target.value})}
                required
              >
                <option value="">-- Select --</option>
                {inventory.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Quantity to Issue</label>
              <input 
                type="number" 
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={issueForm.qty}
                onChange={e => setIssueForm({...issueForm, qty: e.target.value})}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Expected Portions (Outcome)</label>
              <input 
                type="number" 
                style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                value={issueForm.portions}
                onChange={e => setIssueForm({...issueForm, portions: e.target.value})}
                required
              />
              <small style={{ color: '#666' }}>How many plates should the kitchen produce from this?</small>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Issue Materials</button>
          </form>
        </div>
      </div>
    </div>
  );
}
