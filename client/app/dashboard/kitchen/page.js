"use client";

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function KitchenDashboard() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newTask, setNewTask] = useState({
    rawMaterial: '',
    quantity: '',
    product: '',
    expectedPortions: ''
  });

  const [activeTab, setActiveTab] = useState('Operations');
  const [history, setHistory] = useState({ tasks: [], transfers: [] });

  useEffect(() => {
    fetchData();
    if (activeTab === 'History') fetchHistory();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [tasksRes, productsRes] = await Promise.all([
        api.get('/kitchen'),
        api.get('/products')
      ]);
      setTasks(tasksRes.data);
      setProducts(productsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching kitchen data:', err);
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const [tasksRes, transRes] = await Promise.all([
        api.get('/kitchen?all=true'), // I'll update backend to support this
        api.get('/transfers')
      ]);
      setHistory({ tasks: tasksRes.data, transfers: transRes.data });
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/kitchen', newTask);
      setNewTask({ rawMaterial: '', quantity: '', product: '', expectedPortions: '' });
      fetchData();
      toast.success('Preparation task started!');
    } catch (err) {
      toast.error('Error creating task');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/kitchen/${id}`, { status: newStatus });
      fetchData();
      if (newStatus === 'Completed') {
        toast.info('Food transferred! Waiting for Sales to accept.');
      }
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Kitchen...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a1a1a' }}>Kitchen Operations</h1>
        <div style={{ display: 'flex', gap: '1rem', background: '#f3f4f6', padding: '0.4rem', borderRadius: '12px' }}>
          {['Operations', 'History'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab ? 'white' : 'transparent',
                boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Operations' ? (
        <>
          {/* New Task Form */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Start New Preparation</h2>
            <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Raw Material</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rice, Chicken" 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={newTask.rawMaterial}
                  onChange={e => setNewTask({...newTask, rawMaterial: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Raw Quantity</label>
                <input 
                  type="text" 
                  placeholder="e.g. 2 Bags, 1 Carton" 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={newTask.quantity}
                  onChange={e => setNewTask({...newTask, quantity: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Resulting Menu Item</label>
                <select 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={newTask.product}
                  onChange={e => setNewTask({...newTask, product: e.target.value})}
                >
                  <option value="">Select Item</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Expected Portions</label>
                <input 
                  type="number" 
                  placeholder="100" 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  value={newTask.expectedPortions}
                  onChange={e => setNewTask({...newTask, expectedPortions: e.target.value})}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem' }}>Start Prep</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Active Tasks</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Raw Material</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Menu Item</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Portions</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{task.rawMaterial}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{task.quantity}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{task.product?.name}</td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--primary-orange)', fontWeight: 'bold' }}>{task.expectedPortions}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.875rem',
                          backgroundColor: task.status === 'In Progress' ? '#fef08a' : '#f3f4f6',
                          color: task.status === 'In Progress' ? '#854d0e' : '#374151'
                        }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {task.status === 'Pending' && (
                          <button onClick={() => updateStatus(task._id, 'In Progress')} className="btn-secondary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>Start Prep</button>
                        )}
                        {task.status === 'In Progress' && (
                          <button onClick={() => updateStatus(task._id, 'Completed')} className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>Finish & Transfer</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* History Sections */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Raw Material Usage History</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th>Date</th>
                    <th>Material</th>
                    <th>Qty</th>
                    <th>Output</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.tasks.map(task => (
                    <tr key={task._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '0.75rem 0' }}>{new Date(task.createdAt).toLocaleDateString()}</td>
                      <td>{task.rawMaterial}</td>
                      <td>{task.quantity}</td>
                      <td>{task.product?.name} ({task.expectedPortions})</td>
                      <td>{task.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Sent to Sales (Transfers)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.transfers.map(trans => (
                    <tr key={trans._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '0.75rem 0' }}>{new Date(trans.createdAt).toLocaleString()}</td>
                      <td>{trans.product?.name}</td>
                      <td>{trans.quantity}</td>
                      <td>
                        <span style={{ 
                          color: trans.status === 'Accepted' ? '#166534' : '#854d0e',
                          fontWeight: 'bold'
                        }}>
                          {trans.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
