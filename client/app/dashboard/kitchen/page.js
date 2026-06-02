"use client";

import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css';

export default function KitchenDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Prep Operations');
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myReturns, setMyReturns] = useState([]);
  const [history, setHistory] = useState({ tasks: [], transfers: [] });

  // Forms
  const [newTask, setNewTask] = useState({ rawMaterial: '', quantity: '', product: '', expectedPortions: '' });
  const [newRequest, setNewRequest] = useState({ inventoryItem: '', quantityRequested: '', unit: 'Kg', expectedPortions: '', comment: '' });
  const [newTransfer, setNewTransfer] = useState({ product: '', quantity: '', unit: 'Number', kitchenComment: '', to: 'Sales' });
  const [newReturn, setNewReturn] = useState({ inventoryItem: '', quantityReturned: '', unit: 'Kg', comment: '' });

  // End of Day
  const [dailyLog, setDailyLog] = useState([{ inventoryItem: '', itemName: '', quantity: '', unit: 'Kg' }]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        api.get('/products'),
        api.get('/inventory')
      ]);
      setProducts(prodRes.data);
      setInventory(invRes.data);

      if (activeTab === 'Prep Operations') {
        const res = await api.get('/kitchen');
        setTasks(res.data);
      } else if (activeTab === 'Material Requests') {
        const res = await api.get('/kitchen-requests/my-requests');
        setMyRequests(res.data);
      } else if (activeTab === 'Return to Store') {
        const res = await api.get('/kitchen/returns');
        // Filter just this user's returns on frontend for simplicity, or we'd add an endpoint
        setMyReturns(res.data); 
      } else if (activeTab === 'History' || activeTab === 'Transfer to Sales') {
        const [tasksRes, transRes] = await Promise.all([
          api.get('/kitchen?all=true'),
          api.get('/transfers')
        ]);
        setHistory({ tasks: tasksRes.data, transfers: transRes.data });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/kitchen', newTask);
      setNewTask({ rawMaterial: '', quantity: '', product: '', expectedPortions: '' });
      fetchData();
      toast.success('Preparation task started!');
    } catch (err) { toast.error('Error creating task'); }
  };

  const updateTaskStatus = async (id, newStatus) => {
    try {
      await api.put(`/kitchen/${id}`, { status: newStatus });
      fetchData();
      if (newStatus === 'Completed') toast.info('Prep finished. Please log transfer to sales.');
    } catch (err) { toast.error('Error updating status'); }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/kitchen-requests', newRequest);
      setNewRequest({ inventoryItem: '', quantityRequested: '', unit: 'Kg', expectedPortions: '', comment: '' });
      fetchData();
      toast.success('Request sent to Store!');
    } catch (err) { toast.error('Error sending request'); }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transfers', newTransfer);
      setNewTransfer({ product: '', quantity: '', unit: 'Number', kitchenComment: '', to: 'Sales' });
      fetchData();
      toast.success('Transfer logged. Waiting for Manager Approval.');
    } catch (err) { toast.error('Error creating transfer'); }
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    try {
      await api.post('/kitchen/returns', newReturn);
      setNewReturn({ inventoryItem: '', quantityReturned: '', unit: 'Kg', comment: '' });
      fetchData();
      toast.success('Return logged. Waiting for Store to accept.');
    } catch (err) { toast.error('Error creating return'); }
  };

  const handleDailyLogSubmit = async () => {
    if (dailyLog.some(item => !item.inventoryItem || !item.quantity)) {
      toast.warning('Please fill in all log rows properly.');
      return;
    }
    
    const formattedData = dailyLog.map(log => {
      const invItem = inventory.find(i => i._id === log.inventoryItem);
      return { ...log, itemName: invItem?.itemName || 'Unknown' };
    });

    try {
      await api.post('/kitchen/daily-log', { materials: formattedData });
      toast.success('End of day audit saved securely.');
      setDailyLog([{ inventoryItem: '', itemName: '', quantity: '', unit: 'Kg' }]);
    } catch (err) { toast.error('Error submitting daily log'); }
  };

  if (loading && !products.length) return <div style={{ padding: '2rem' }}>Loading Kitchen...</div>;

  return (
    <div className={styles.managerWrapper}>
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Prep Operations' ? styles.active : ''}`} onClick={() => setActiveTab('Prep Operations')}>
            <span className={styles.icon}>🔪</span> Prep Operations
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Transfer to Sales' ? styles.active : ''}`} onClick={() => setActiveTab('Transfer to Sales')}>
            <span className={styles.icon}>📤</span> Transfer to Sales
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Material Requests' ? styles.active : ''}`} onClick={() => setActiveTab('Material Requests')}>
            <span className={styles.icon}>📥</span> Material Requests
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Return to Store' ? styles.active : ''}`} onClick={() => setActiveTab('Return to Store')}>
            <span className={styles.icon}>↩️</span> Return to Store
          </button>
        </div>

        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'End of Day Log' ? styles.active : ''}`} onClick={() => setActiveTab('End of Day Log')}>
            <span className={styles.icon}>📝</span> End of Day Log
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'History' ? styles.active : ''}`} onClick={() => setActiveTab('History')}>
            <span className={styles.icon}>📋</span> History
          </button>
        </div>
      </nav>

      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
          </div>
          <button className={styles.btnSecondary} onClick={fetchData}>🔄 Refresh</button>
        </header>

        {activeTab === 'Prep Operations' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Start New Preparation</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateTask} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Raw Material / Recipe Note</label>
                    <input type="text" className={styles.formControl} required value={newTask.rawMaterial} onChange={e => setNewTask({...newTask, rawMaterial: e.target.value})} placeholder="e.g. 5kg Rice, 2kg Meat" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Resulting Menu Item</label>
                    <select required className={styles.formControl} value={newTask.product} onChange={e => setNewTask({...newTask, product: e.target.value})}>
                      <option value="">Select Target Item</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Expected Yield (Portions/Kg)</label>
                    <input type="number" className={styles.formControl} required value={newTask.expectedPortions} onChange={e => setNewTask({...newTask, expectedPortions: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '1rem' }}>
                    <button type="submit" className={styles.btnPrimary}>🔥 Start Prep Task</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Active Prep Tasks</h2></div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Material Details</th>
                      <th>Target Output</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task._id}>
                        <td>{task.rawMaterial}</td>
                        <td style={{ fontWeight: 600 }}>{task.product?.name} <span style={{ color: '#f97316' }}>({task.expectedPortions})</span></td>
                        <td><span className={`${styles.badge} ${task.status === 'In Progress' ? styles.badgeOrange : styles.badgeGray}`}>{task.status}</span></td>
                        <td>
                          {task.status === 'Pending' && <button onClick={() => updateTaskStatus(task._id, 'In Progress')} className={styles.btnSecondary} style={{ padding: '0.4rem' }}>Start Cooking</button>}
                          {task.status === 'In Progress' && <button onClick={() => updateTaskStatus(task._id, 'Completed')} className={styles.btnSuccess} style={{ padding: '0.4rem' }}>Finish</button>}
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No active prep tasks.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Transfer to Sales' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease', maxWidth: '800px' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Log Finished Food Transfer</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Transfers must be approved by the Manager before Sales can accept them.</p>
            </div>
            <div className={styles.panelBody}>
              <form onSubmit={handleCreateTransfer} className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Menu Item Produced</label>
                  <select required className={styles.formControl} value={newTransfer.product} onChange={e => setNewTransfer({...newTransfer, product: e.target.value})}>
                    <option value="">Select Item</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className={styles.formGroup} style={{ flex: 2 }}>
                    <label className={styles.formLabel}>Quantity Sent</label>
                    <input type="number" step="0.01" required className={styles.formControl} value={newTransfer.quantity} onChange={e => setNewTransfer({...newTransfer, quantity: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.formLabel}>Unit</label>
                    <select className={styles.formControl} value={newTransfer.unit} onChange={e => setNewTransfer({...newTransfer, unit: e.target.value})}>
                      <option value="Number">Plates/Pieces</option>
                      <option value="Kg">Kg</option>
                      <option value="Gram">Grams</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Destination Counter</label>
                  <select className={styles.formControl} value={newTransfer.to} onChange={e => setNewTransfer({...newTransfer, to: e.target.value})}>
                    <option value="Sales">Sales Counter (POS)</option>
                    <option value="Eatery">Eatery Counter</option>
                  </select>
                </div>
                <div className={`${styles.formGroup} ${styles.full}`}>
                  <label className={styles.formLabel}>Comment for Manager (Optional)</label>
                  <input type="text" className={styles.formControl} placeholder="e.g., Output was slightly lower due to spillage" value={newTransfer.kitchenComment} onChange={e => setNewTransfer({...newTransfer, kitchenComment: e.target.value})} />
                </div>
                <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '0.5rem' }}>
                  <button type="submit" className={styles.btnPrimary}>📤 Send Transfer Request</button>
                </div>
              </form>
            </div>

            <h3 style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>Recent Transfers</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Volume Sent</th>
                    <th>Destination</th>
                    <th>Manager Status</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.transfers.map(trans => (
                    <tr key={trans._id}>
                      <td>{new Date(trans.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{trans.product?.name}</td>
                      <td>{trans.quantity} {trans.unit}</td>
                      <td>
                        <span className={styles.badge} style={{ background: trans.to === 'Eatery' ? '#ffedd5' : '#dcfce3', color: trans.to === 'Eatery' ? '#ea580c' : '#166534', border: 'none' }}>
                          {trans.to || 'Sales'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${trans.managerStatus === 'Approved' ? styles.badgeGreen : trans.managerStatus === 'Rejected' ? styles.badgeRed : styles.badgeOrange}`}>
                          {trans.managerStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${trans.status === 'Accepted' ? styles.badgeGreen : styles.badgeGray}`}>
                          {trans.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.transfers.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No recent transfers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Material Requests' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Request Raw Materials</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateRequest} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Store Item Needed</label>
                    <select required className={styles.formControl} value={newRequest.inventoryItem} onChange={e => setNewRequest({...newRequest, inventoryItem: e.target.value})}>
                      <option value="">Select Item</option>
                      {inventory.map(item => <option key={item._id} value={item._id}>{item.itemName} ({item.category})</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} className={styles.full}>
                    <div className={styles.formGroup} style={{ flex: 2 }}>
                      <label className={styles.formLabel}>Volume Needed</label>
                      <input type="number" step="0.01" required className={styles.formControl} value={newRequest.quantityRequested} onChange={e => setNewRequest({...newRequest, quantityRequested: e.target.value})} />
                    </div>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label className={styles.formLabel}>Unit</label>
                      <select className={styles.formControl} value={newRequest.unit} onChange={e => setNewRequest({...newRequest, unit: e.target.value})}>
                        <option value="Kg">Kg</option>
                        <option value="Gram">Gram</option>
                      </select>
                    </div>
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Purpose / Comment</label>
                    <input type="text" className={styles.formControl} placeholder="e.g. Needed for 20 plates of Fried Rice" value={newRequest.comment} onChange={e => setNewRequest({...newRequest, comment: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className={styles.btnPrimary}>📥 Send Request to Store</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>My Pending & Recent Requests</h2></div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(req => (
                      <tr key={req._id}>
                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{req.inventoryItem?.itemName}</td>
                        <td>{req.quantityRequested} {req.unit}</td>
                        <td><span className={`${styles.badge} ${req.status === 'Accepted' ? styles.badgeGreen : req.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>{req.status}</span></td>
                      </tr>
                    ))}
                    {myRequests.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No requests sent.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Return to Store' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease', maxWidth: '800px' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Return Unused Materials to Store</h2>
            </div>
            <div className={styles.panelBody}>
              <form onSubmit={handleCreateReturn} className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.full}`}>
                  <label className={styles.formLabel}>Item Being Returned</label>
                  <select required className={styles.formControl} value={newReturn.inventoryItem} onChange={e => setNewReturn({...newReturn, inventoryItem: e.target.value})}>
                    <option value="">Select Item</option>
                    {inventory.map(item => <option key={item._id} value={item._id}>{item.itemName} ({item.category})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }} className={styles.full}>
                  <div className={styles.formGroup} style={{ flex: 2 }}>
                    <label className={styles.formLabel}>Volume Returned</label>
                    <input type="number" step="0.01" required className={styles.formControl} value={newReturn.quantityReturned} onChange={e => setNewReturn({...newReturn, quantityReturned: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.formLabel}>Unit</label>
                    <select className={styles.formControl} value={newReturn.unit} onChange={e => setNewReturn({...newReturn, unit: e.target.value})}>
                      <option value="Kg">Kg</option>
                      <option value="Gram">Gram</option>
                    </select>
                  </div>
                </div>
                <div className={`${styles.formGroup} ${styles.full}`}>
                  <label className={styles.formLabel}>Reason for Return</label>
                  <input type="text" required className={styles.formControl} value={newReturn.comment} onChange={e => setNewReturn({...newReturn, comment: e.target.value})} placeholder="e.g. Excess material from prep" />
                </div>
                <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '0.5rem' }}>
                  <button type="submit" className={styles.btnPrimary} style={{ background: '#6366f1' }}>↩️ Submit Return</button>
                </div>
              </form>
            </div>

            <h3 style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>Return History</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Qty Returned</th>
                    <th>Reason</th>
                    <th>Store Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myReturns.map(ret => (
                    <tr key={ret._id}>
                      <td>{new Date(ret.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{ret.inventoryItem?.itemName}</td>
                      <td>{ret.quantityReturned} {ret.unit}</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>{ret.comment}</td>
                      <td><span className={`${styles.badge} ${ret.status === 'Accepted' ? styles.badgeGreen : ret.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>{ret.status}</span></td>
                    </tr>
                  ))}
                  {myReturns.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No returns found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'End of Day Log' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>End of Day Kitchen Stock Audit</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>Log all physical materials remaining in the kitchen. This does NOT automatically modify store inventory, it is for managerial auditing.</p>
            </div>
            <div className={styles.panelBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dailyLog.map((logRow, index) => (
                  <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ flex: 2 }}>
                      <label className={styles.formLabel}>Item</label>
                      <select required className={styles.formControl} value={logRow.inventoryItem} onChange={e => {
                        const newLog = [...dailyLog];
                        newLog[index].inventoryItem = e.target.value;
                        setDailyLog(newLog);
                      }}>
                        <option value="">Select Item</option>
                        {inventory.map(item => <option key={item._id} value={item._id}>{item.itemName} ({item.category})</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className={styles.formLabel}>Volume Remaining</label>
                      <input type="number" step="0.01" required className={styles.formControl} value={logRow.quantity} onChange={e => {
                        const newLog = [...dailyLog];
                        newLog[index].quantity = e.target.value;
                        setDailyLog(newLog);
                      }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className={styles.formLabel}>Unit</label>
                      <select className={styles.formControl} value={logRow.unit} onChange={e => {
                        const newLog = [...dailyLog];
                        newLog[index].unit = e.target.value;
                        setDailyLog(newLog);
                      }}>
                        <option value="Kg">Kg</option>
                        <option value="Gram">Gram</option>
                        <option value="Number">Pieces/Items</option>
                      </select>
                    </div>
                    {index > 0 && (
                      <button className={styles.btnDanger} style={{ padding: '0.75rem' }} onClick={() => {
                        const newLog = dailyLog.filter((_, i) => i !== index);
                        setDailyLog(newLog);
                      }}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className={styles.btnSecondary} onClick={() => setDailyLog([...dailyLog, { inventoryItem: '', itemName: '', quantity: '', unit: 'Kg' }])}>
                  ➕ Add Another Item
                </button>
                <button className={styles.btnPrimary} onClick={handleDailyLogSubmit} style={{ marginLeft: 'auto' }}>
                  💾 Submit End of Day Log
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
