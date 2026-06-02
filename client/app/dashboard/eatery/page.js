"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from './page.module.css';

export default function EateryDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Counter Operations');
  const [loading, setLoading] = useState(true);

  // Data states
  const [inventory, setInventory] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  // Material Request Form State
  const [newRequest, setNewRequest] = useState({
    inventoryItem: '',
    quantityRequested: '',
    unit: 'Number',
    comment: ''
  });

  useEffect(() => {
    fetchEateryData();
  }, [activeTab]);

  const fetchEateryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch store inventory items for requests dropdown
      const invRes = await api.get('/inventory');
      // Filter non-food packaging items on client-side if categories exist, otherwise show all
      setInventory(invRes.data);

      if (activeTab === 'Counter Operations') {
        // 2. Fetch pending kitchen transfers for eatery
        const pendingRes = await api.get('/transfers/pending');
        setPendingTransfers(pendingRes.data);

        // 3. Fetch historical transfers
        const historyRes = await api.get('/transfers');
        setTransferHistory(historyRes.data);
      } else if (activeTab === 'Material Requests') {
        // 4. Fetch own requests from Store
        const requestsRes = await api.get('/eatery-requests/my-requests');
        setMyRequests(requestsRes.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading eatery data:', err);
      toast.error('Failed to load data. Please refresh.');
      setLoading(false);
    }
  };

  const handleAcceptTransfer = async (id) => {
    try {
      await api.put(`/transfers/${id}/accept`);
      toast.success('Food transfer received & registered at counter!');
      fetchEateryData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to acknowledge receipt');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newRequest.inventoryItem || !newRequest.quantityRequested) {
      toast.warning('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/eatery-requests', {
        ...newRequest,
        quantityRequested: Number(newRequest.quantityRequested)
      });
      toast.success('Packaging request sent to Store!');
      setNewRequest({ inventoryItem: '', quantityRequested: '', unit: 'Number', comment: '' });
      fetchEateryData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error submitting request');
    }
  };

  if (!user || (user.role !== 'Eatery' && user.role !== 'SuperAdmin')) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  // Derived metrics
  const pendingReceiptCount = pendingTransfers.length;
  const acceptedTodayCount = transferHistory.filter(t => t.status === 'Accepted' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length;
  const pendingMaterialsCount = myRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className={styles.eateryWrapper}>
      {/* Visual Navigation Bar */}
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button 
            className={`${styles.navBtn} ${activeTab === 'Counter Operations' ? styles.active : ''}`} 
            onClick={() => setActiveTab('Counter Operations')}
          >
            <span className={styles.icon}>🍜</span> Counter Operations
            {pendingReceiptCount > 0 && (
              <span className={styles.badgeAlert}>{pendingReceiptCount}</span>
            )}
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'Material Requests' ? styles.active : ''}`} 
            onClick={() => setActiveTab('Material Requests')}
          >
            <span className={styles.icon}>📦</span> Packaging Requests
            {pendingMaterialsCount > 0 && (
              <span className={styles.badgeWarn}>{pendingMaterialsCount}</span>
            )}
          </button>
        </div>
        <button className={styles.btnSecondary} onClick={fetchEateryData}>🔄 Refresh Data</button>
      </nav>

      {/* Main Panel Content */}
      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Eatery Dashboard</h1>
            <p className={styles.pageSubtitle}>Manage counter supplies, receive hot meals, and maintain premium customer packaging.</p>
          </div>
        </header>

        {/* Dynamic Statistics Cards */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard} style={{ borderLeft: '5px solid var(--primary-orange)' }}>
            <div className={styles.statLabel}>Pending Kitchen Receipts</div>
            <div className={styles.statValue}>{pendingReceiptCount}</div>
            <div className={styles.statSub}>Plates awaiting counter check-in</div>
          </div>
          <div className={styles.statCard} style={{ borderLeft: '5px solid var(--primary-green)' }}>
            <div className={styles.statLabel}>Received Today</div>
            <div className={styles.statValue} style={{ color: 'var(--primary-green)' }}>{acceptedTodayCount}</div>
            <div className={styles.statSub}>Meals accepted at eatery counter</div>
          </div>
          <div className={styles.statCard} style={{ borderLeft: '5px solid #6366f1' }}>
            <div className={styles.statLabel}>Pending Material Supplies</div>
            <div className={styles.statValue} style={{ color: '#6366f1' }}>{pendingMaterialsCount}</div>
            <div className={styles.statSub}>Store requests awaiting approval</div>
          </div>
        </section>

        {/* TAB CONTENT: COUNTER OPERATIONS */}
        {activeTab === 'Counter Operations' && (
          <div className={styles.twoCol}>
            {/* Panel 1: Pending food arrivals */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>📥 Incoming Hot Meals from Kitchen</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Meal Name</th>
                        <th>Volume / Qty</th>
                        <th>Sent By</th>
                        <th>Comment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransfers.map(trans => (
                        <tr key={trans._id}>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>{trans.product?.name}</td>
                          <td style={{ fontWeight: 800, color: 'var(--primary-orange)' }}>{trans.quantity} {trans.unit}</td>
                          <td>{trans.handledBy?.username || 'Kitchen'}</td>
                          <td style={{ fontStyle: 'italic', color: '#64748b' }}>{trans.kitchenComment || 'No comment'}</td>
                          <td>
                            <button 
                              onClick={() => handleAcceptTransfer(trans._id)}
                              className={styles.actionBtnAccept}
                            >
                              ✓ Accept at Counter
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pendingTransfers.length === 0 && (
                        <tr>
                          <td colSpan="5" className={styles.emptyState}>
                            No pending food transfers from the kitchen. Hot meals will appear here as soon as the kitchen logs a transfer and a Manager approves it.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Panel 2: Past Receipt Log */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>📋 Counter Receipt History</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Meal</th>
                        <th>Volume</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferHistory.map(trans => (
                        <tr key={trans._id}>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(trans.createdAt).toLocaleString()}</td>
                          <td style={{ fontWeight: 600 }}>{trans.product?.name}</td>
                          <td>{trans.quantity} {trans.unit}</td>
                          <td>
                            <span className={`${styles.badge} ${trans.status === 'Accepted' ? styles.badgeGreen : styles.badgeOrange}`}>
                              {trans.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {transferHistory.length === 0 && (
                        <tr>
                          <td colSpan="4" className={styles.emptyState}>No completed counter receipts logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: PACKAGING / STORE REQUESTS */}
        {activeTab === 'Material Requests' && (
          <div className={styles.twoCol}>
            {/* Panel 1: Request Form */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>🛍️ Request Materials from Store</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateRequest} className={styles.formGrid}>
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Packaging Item Needed</label>
                    <select 
                      required 
                      className={styles.formControl} 
                      value={newRequest.inventoryItem} 
                      onChange={e => {
                        const selected = inventory.find(i => i._id === e.target.value);
                        setNewRequest({
                          ...newRequest,
                          inventoryItem: e.target.value,
                          unit: selected?.unit || 'Number'
                        });
                      }}
                    >
                      <option value="">-- Select Material --</option>
                      {inventory.map(item => (
                        <option key={item._id} value={item._id}>
                          {item.itemName} ({item.category}) - Avail: {item.quantityInStock} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Quantity Requested</label>
                    <input 
                      type="number" 
                      min="1" 
                      step="any" 
                      required 
                      placeholder="e.g. 50" 
                      className={styles.formControl} 
                      value={newRequest.quantityRequested} 
                      onChange={e => setNewRequest({...newRequest, quantityRequested: e.target.value})} 
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Measurement Unit</label>
                    <input 
                      type="text" 
                      className={styles.formControl} 
                      readOnly 
                      disabled
                      value={newRequest.unit} 
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Purpose / Note (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Dinner rush packaging, counter napkins" 
                      className={styles.formControl} 
                      value={newRequest.comment} 
                      onChange={e => setNewRequest({...newRequest, comment: e.target.value})} 
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                    <button type="submit" className={styles.btnPrimaryFull}>
                      📤 Submit Supply Request
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Panel 2: Materials History Table */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>📋 My Recent Material Requests</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Material</th>
                        <th>Volume</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map(req => (
                        <tr key={req._id}>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 700 }}>{req.inventoryItem?.itemName}</td>
                          <td style={{ fontWeight: 800 }}>{req.quantityRequested} {req.unit}</td>
                          <td>
                            <span className={`${styles.badge} ${
                              req.status === 'Accepted' ? styles.badgeGreen : 
                              req.status === 'Declined' ? styles.badgeRed : 
                              styles.badgeOrange
                            }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {myRequests.length === 0 && (
                        <tr>
                          <td colSpan="4" className={styles.emptyState}>No material requests created yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
