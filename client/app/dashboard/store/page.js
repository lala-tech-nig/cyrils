"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css'; // Reusing manager styles for consistency

export default function StoreDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');

  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supplyHistory, setSupplyHistory] = useState([]);
  const [kitchenRequests, setKitchenRequests] = useState([]);
  const [kitchenReturns, setKitchenReturns] = useState([]);
  const [eateryRequests, setEateryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  // New Supply Form
  const [supplyForm, setSupplyForm] = useState({
    itemName: '',
    category: '',
    newCategory: '',
    unit: 'Kg',
    quantity: '',
    cost: '',
    supplierName: '',
    comment: ''
  });

  // Filters
  const [historyFilter, setHistoryFilter] = useState({ timeRange: 'all', supplier: '' });
  const [inventoryFilter, setInventoryFilter] = useState({ category: '', search: '' });

  useEffect(() => {
    fetchStoreData();
  }, [activeTab]);

  const fetchStoreData = async () => {
    try {
      if (activeTab === 'Overview' || activeTab === 'Inventory Directory' || activeTab === 'Restock') {
        const [invRes, catRes, analyticsRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/inventory/categories'),
          api.get('/inventory/analytics')
        ]);
        setInventory(invRes.data);
        setCategories(catRes.data);
        setAnalyticsData(analyticsRes.data);
      }
      
      if (activeTab === 'Overview' || activeTab === 'Kitchen Operations' || activeTab === 'Eatery Operations') {
        const [reqRes, retRes, eatRes] = await Promise.all([
          api.get('/kitchen-requests'),
          api.get('/kitchen/returns'),
          api.get('/eatery-requests')
        ]);
        setKitchenRequests(reqRes.data);
        setKitchenReturns(retRes.data);
        setEateryRequests(eatRes.data);
      }
      
      if (activeTab === 'Overview' || activeTab === 'Supply History') {
        fetchFilteredHistory();
      }
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load store data');
      setLoading(false);
    }
  };

  const filterByTimeRange = (dateString, range) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (range === 'today') return date >= today;
    if (range === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return date >= startOfWeek;
    }
    if (range === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return date >= startOfMonth;
    }
    return true;
  };

  const fetchFilteredHistory = async () => {
    try {
      let query = `?`;
      if (historyFilter.supplier) query += `supplier=${historyFilter.supplier}&`;
      
      const today = new Date();
      if (historyFilter.timeRange === 'today') {
        today.setHours(0,0,0,0);
        query += `startDate=${today.toISOString()}&`;
      } else if (historyFilter.timeRange === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0,0,0,0);
        query += `startDate=${startOfWeek.toISOString()}&`;
      } else if (historyFilter.timeRange === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        query += `startDate=${startOfMonth.toISOString()}&`;
      }

      const res = await api.get(`/inventory/history${query}`);
      setSupplyHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Supply History') fetchFilteredHistory();
  }, [historyFilter]);

  const handleSupplySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...supplyForm,
        quantity: Number(supplyForm.quantity),
        cost: Number(supplyForm.cost),
        category: supplyForm.category === 'new' ? supplyForm.newCategory : supplyForm.category
      };
      
      await api.post('/inventory/supply', payload);
      toast.success('Supply logged and inventory updated!');
      setSupplyForm({ itemName: '', category: '', newCategory: '', unit: 'Kg', quantity: '', cost: '', supplierName: '', comment: '' });
      fetchStoreData();
    } catch (err) {
      toast.error('Error logging supply');
    }
  };

  const handleRequestAction = async (id, action) => {
    try {
      await api.put(`/kitchen-requests/${id}/status`, { action });
      toast.success(`Request ${action}ed successfully`);
      fetchStoreData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error processing request`);
    }
  };

  const handleReturnAction = async (id, action) => {
    try {
      await api.put(`/kitchen/returns/${id}/status`, { action });
      toast.success(`Return ${action}ed successfully`);
      fetchStoreData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error processing return`);
    }
  };
  
  const handleEateryRequestAction = async (id, action) => {
    try {
      await api.put(`/eatery-requests/${id}/status`, { action });
      toast.success(`Eatery Request ${action}ed successfully`);
      fetchStoreData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error processing request`);
    }
  };

  if (!user || (user.role !== 'Store' && user.role !== 'Manager' && user.role !== 'SuperAdmin')) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  const filteredInventory = inventory.filter(item => {
    const matchCategory = inventoryFilter.category ? item.category === inventoryFilter.category : true;
    const matchSearch = inventoryFilter.search ? item.itemName.toLowerCase().includes(inventoryFilter.search.toLowerCase()) : true;
    return matchCategory && matchSearch;
  });

  const totalStoreValue = inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0);

  if (loading) return <div style={{ padding: '2rem' }}>Loading Store Dashboard...</div>;

  return (
    <div className={styles.managerWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Overview' ? styles.active : ''}`} onClick={() => setActiveTab('Overview')}>
            <span className={styles.icon}>📊</span> Store Overview
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Inventory Directory' ? styles.active : ''}`} onClick={() => setActiveTab('Inventory Directory')}>
            <span className={styles.icon}>📦</span> Inventory Directory
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Restock' ? styles.active : ''}`} onClick={() => setActiveTab('Restock')}>
            <span className={styles.icon}>📥</span> Log Supply
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Supply History' ? styles.active : ''}`} onClick={() => setActiveTab('Supply History')}>
            <span className={styles.icon}>📋</span> Supply Ledger
          </button>
        </div>

        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Kitchen Operations' ? styles.active : ''}`} onClick={() => setActiveTab('Kitchen Operations')}>
            <span className={styles.icon}>🔪</span> Kitchen Operations
            {(kitchenRequests.filter(r => r.status === 'Pending').length + kitchenReturns.filter(r => r.status === 'Pending').length) > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                {kitchenRequests.filter(r => r.status === 'Pending').length + kitchenReturns.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Eatery Operations' ? styles.active : ''}`} onClick={() => setActiveTab('Eatery Operations')}>
            <span className={styles.icon}>🏪</span> Eatery Operations
            {eateryRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span style={{ background: '#f97316', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                {eateryRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
            <p className={styles.pageSubtitle}>Welcome back, {user.username}</p>
          </div>
          <button className={styles.btnSecondary} onClick={fetchStoreData}>
            🔄 Refresh
          </button>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && analyticsData && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <div className={styles.statLabel}>Est. Inventory Cost Value</div>
                <div className={styles.statValue} style={{ color: '#1e293b' }}>₦{analyticsData.totalValue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className={styles.statSub}>{analyticsData.totalItems} items tracked</div>
              </div>
              <div className={styles.statCard} style={{ background: '#ecfdf5', borderLeft: '4px solid #10b981' }}>
                <div className={styles.statLabel}>Est. Retail Value</div>
                <div className={styles.statValue} style={{ color: '#059669' }}>₦{analyticsData.totalRetailValue?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className={styles.statSub}>Potential Profit: ₦{analyticsData.potentialProfit?.toLocaleString()}</div>
              </div>
              <div className={styles.statCard} style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
                <div className={styles.statLabel}>Low Stock Alerts</div>
                <div className={styles.statValue} style={{ color: '#dc2626' }}>{analyticsData.lowStockItems?.length} Items</div>
                <div className={styles.statSub}>Require immediate restocking</div>
              </div>
              <div className={styles.statCard} style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                <div className={styles.statLabel}>Pending Ops (Kitchen/Eatery)</div>
                <div className={styles.statValue} style={{ color: '#d97706' }}>
                  {kitchenRequests.filter(r => r.status === 'Pending').length + kitchenReturns.filter(r => r.status === 'Pending').length + eateryRequests.filter(r => r.status === 'Pending').length} Action(s)
                </div>
                <div className={styles.statSub}>Awaiting store approval</div>
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.panel} style={{ borderTop: '4px solid #ef4444' }}>
                <div className={styles.panelHeader} style={{ background: '#fef2f2' }}>
                  <h2 className={styles.panelTitle} style={{ color: '#ef4444' }}>⚠️ Urgent Low Stock</h2>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Qty Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.lowStockItems?.slice(0, 5).map(item => (
                        <tr key={item._id}>
                          <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                          <td><span className={`${styles.badge} ${styles.badgeGray}`}>{item.category}</span></td>
                          <td style={{ fontWeight: 800, color: '#ef4444' }}>{item.quantityInStock} {item.unit}</td>
                        </tr>
                      ))}
                      {analyticsData.lowStockItems?.length === 0 && (
                        <tr><td colSpan="3" className={styles.emptyState}>All items are adequately stocked!</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Recent Incoming Supplies</h2>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Qty Added</th>
                        <th>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplyHistory.slice(0, 5).map(history => (
                        <tr key={history._id}>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(history.suppliedAt).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600 }}>{history.inventoryItem?.itemName || 'Unknown Item'}</td>
                          <td style={{ fontWeight: 800, color: '#16a34a' }}>+{history.quantity} {history.unit}</td>
                          <td>₦{history.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                      {supplyHistory.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No recent supply history.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'Inventory Directory' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.filterBar}>
                <input 
                  type="text" 
                  placeholder="Search item..." 
                  className={styles.filterInput}
                  value={inventoryFilter.search}
                  onChange={(e) => setInventoryFilter({...inventoryFilter, search: e.target.value})}
                  style={{ minWidth: '250px' }}
                />
                <select 
                  className={styles.filterSelect} 
                  value={inventoryFilter.category} 
                  onChange={(e) => setInventoryFilter({...inventoryFilter, category: e.target.value})}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Available Qty</th>
                      <th>Avg Cost/Unit</th>
                      <th>Total Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{item.category}</span></td>
                        <td style={{ fontWeight: 800, color: item.quantityInStock <= 5 ? '#dc2626' : '#1e293b' }}>
                          {item.quantityInStock.toLocaleString()} {item.unit}
                        </td>
                        <td>₦{item.averageCostPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td style={{ fontWeight: 600, color: '#16a34a' }}>₦{item.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No items found in inventory.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RESTOCK / NEW INPUT TAB */}
        {activeTab === 'Restock' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease', maxWidth: '800px' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Log Incoming Supply</h2>
            </div>
            <div className={styles.panelBody}>
              <form onSubmit={handleSupplySubmit} className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Item Name (Type to add new or select existing)</label>
                  <input 
                    type="text" 
                    list="inventory-items"
                    className={styles.formControl} 
                    required 
                    value={supplyForm.itemName} 
                    onChange={e => {
                      const val = e.target.value;
                      setSupplyForm({...supplyForm, itemName: val});
                      // Auto-fill category if item exists
                      const existing = inventory.find(i => i.itemName.toLowerCase() === val.toLowerCase());
                      if (existing) {
                        setSupplyForm(prev => ({...prev, category: existing.category, unit: existing.unit}));
                      }
                    }} 
                  />
                  <datalist id="inventory-items">
                    {inventory.map(item => <option key={item._id} value={item.itemName} />)}
                  </datalist>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select 
                    className={styles.formControl} 
                    required 
                    value={supplyForm.category} 
                    onChange={e => setSupplyForm({...supplyForm, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="new">+ Add New Category</option>
                  </select>
                </div>

                {supplyForm.category === 'new' && (
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>New Category Name</label>
                    <input 
                      type="text" 
                      className={styles.formControl} 
                      required 
                      value={supplyForm.newCategory} 
                      onChange={e => setSupplyForm({...supplyForm, newCategory: e.target.value})} 
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Volume Supplied</label>
                  <input 
                    type="number" step="0.01" className={styles.formControl} required 
                    value={supplyForm.quantity} onChange={e => setSupplyForm({...supplyForm, quantity: e.target.value})} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Measurement Unit</label>
                  <select 
                    className={styles.formControl} 
                    value={supplyForm.unit} 
                    onChange={e => setSupplyForm({...supplyForm, unit: e.target.value})}
                  >
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Total Cost of Supply (₦)</label>
                  <input 
                    type="number" className={styles.formControl} required 
                    value={supplyForm.cost} onChange={e => setSupplyForm({...supplyForm, cost: e.target.value})} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Supplier Name</label>
                  <input 
                    type="text" className={styles.formControl} required 
                    value={supplyForm.supplierName} onChange={e => setSupplyForm({...supplyForm, supplierName: e.target.value})} 
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.full}`}>
                  <label className={styles.formLabel}>Comment / Waybill Info</label>
                  <input 
                    type="text" className={styles.formControl} 
                    value={supplyForm.comment} onChange={e => setSupplyForm({...supplyForm, comment: e.target.value})} 
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '1rem' }}>
                  <button type="submit" className={styles.btnPrimary}>📥 Record Supply to Inventory</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUPPLY HISTORY TAB */}
        {activeTab === 'Supply History' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.filterBar}>
              <div className={styles.filterBtnGroup}>
                {['today', 'week', 'month', 'all'].map(range => (
                  <button 
                    key={range} 
                    className={`${styles.filterPill} ${historyFilter.timeRange === range ? styles.active : ''}`}
                    onClick={() => setHistoryFilter({...historyFilter, timeRange: range})}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Filter by Supplier" 
                className={styles.filterInput}
                value={historyFilter.supplier}
                onChange={(e) => setHistoryFilter({...historyFilter, supplier: e.target.value})}
              />
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Supplier Name</th>
                    <th>Item Restocked</th>
                    <th>Volume Added</th>
                    <th>Total Cost</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {supplyHistory.map(history => (
                    <tr key={history._id}>
                      <td>{new Date(history.suppliedAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{history.supplierName}</td>
                      <td>{history.inventoryItem?.itemName || 'Unknown Item'}</td>
                      <td style={{ fontWeight: 800 }}>{history.quantity} {history.unit}</td>
                      <td>₦{history.cost.toLocaleString()}</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>{history.comment || '-'}</td>
                    </tr>
                  ))}
                  {supplyHistory.length === 0 && <tr><td colSpan="6" className={styles.emptyState}>No supply history found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KITCHEN REQUESTS & RETURNS TAB */}
        {activeTab === 'Kitchen Operations' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Incoming Kitchen Material Requests</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Requested By</th>
                      <th>Item Requested</th>
                      <th>Volume</th>
                      <th>Yield</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitchenRequests.map(req => (
                      <tr key={req._id}>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(req.createdAt).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{req.requestedBy?.username || 'Kitchen'}</td>
                        <td>{req.inventoryItem?.itemName}</td>
                        <td style={{ fontWeight: 800, color: '#f97316' }}>{req.quantityRequested} {req.unit}</td>
                        <td>{req.expectedPortions} Portions</td>
                        <td>
                          <span className={`${styles.badge} ${req.status === 'Accepted' ? styles.badgeGreen : req.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          {req.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className={styles.btnSuccess} onClick={() => handleRequestAction(req._id, 'accept')}>Accept</button>
                              <button className={styles.btnDanger} onClick={() => handleRequestAction(req._id, 'decline')}>Decline</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {kitchenRequests.length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No incoming kitchen requests.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Materials Returned by Kitchen</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Returned By</th>
                      <th>Item</th>
                      <th>Volume</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitchenReturns.map(ret => (
                      <tr key={ret._id}>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(ret.createdAt).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{ret.returnedBy?.username || 'Kitchen'}</td>
                        <td>{ret.inventoryItem?.itemName}</td>
                        <td style={{ fontWeight: 800, color: '#3b82f6' }}>{ret.quantityReturned} {ret.unit}</td>
                        <td style={{ fontStyle: 'italic', color: '#64748b' }}>{ret.comment}</td>
                        <td>
                          <span className={`${styles.badge} ${ret.status === 'Accepted' ? styles.badgeGreen : ret.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>
                            {ret.status}
                          </span>
                        </td>
                        <td>
                          {ret.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className={styles.btnSuccess} onClick={() => handleReturnAction(ret._id, 'accept')}>Accept</button>
                              <button className={styles.btnDanger} onClick={() => handleReturnAction(ret._id, 'decline')}>Decline</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {kitchenReturns.length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No incoming kitchen returns.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EATERY OPERATIONS TAB */}
        {activeTab === 'Eatery Operations' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Incoming Eatery Material Requests (Non-Food)</h2>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Requested By</th>
                    <th>Material Needed</th>
                    <th>Category</th>
                    <th>Volume</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {eateryRequests.map(req => (
                    <tr key={req._id}>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(req.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{req.requestedBy?.username || 'Eatery'}</td>
                      <td style={{ fontWeight: 600 }}>{req.inventoryItem?.itemName}</td>
                      <td><span className={`${styles.badge} ${styles.badgeGray}`}>{req.inventoryItem?.category || 'Non-Food'}</span></td>
                      <td style={{ fontWeight: 800, color: '#f97316' }}>{req.quantityRequested} {req.unit}</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>{req.comment || '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${req.status === 'Accepted' ? styles.badgeGreen : req.status === 'Declined' ? styles.badgeRed : req.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.btnSuccess} onClick={() => handleEateryRequestAction(req._id, 'accept')}>Accept</button>
                            <button className={styles.btnDanger} onClick={() => handleEateryRequestAction(req._id, 'decline')}>Decline</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Processed by {req.actedUponBy?.username || 'Store'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {eateryRequests.length === 0 && <tr><td colSpan="8" className={styles.emptyState}>No incoming eatery requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
