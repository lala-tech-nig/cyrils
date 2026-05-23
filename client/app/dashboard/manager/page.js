"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from './manager.module.css';

export default function ManagerDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [discountOtp, setDiscountOtp] = useState('----');

  // Overview Data
  const [stats, setStats] = useState({
    totalSales: 0, monthSales: 0, ordersCount: 0, monthOrdersCount: 0, 
    cashReceived: 0, transferReceived: 0, prTotal: 0, staffCount: 0, users: [], todayOrders: [], topItems: []
  });

  // Modules Data
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [prOrders, setPrOrders] = useState([]);

  // Forms & Settings
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'FOOD' });
  const [productImage, setProductImage] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: '', category: 'FOOD' });
  const [editProductImage, setEditProductImage] = useState(null);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', order: 0 });
  const [promoMedia, setPromoMedia] = useState(null);
  const [settings, setSettings] = useState({ isMarketOpen: true });

  // Filters
  const [attendanceFilter, setAttendanceFilter] = useState({ staff: '', dept: '', timeRange: 'all' });
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', category: 'All', paymentMethod: 'All', cashier: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [storeFilter, setStoreFilter] = useState({ timeRange: 'all' });

  useEffect(() => {
    fetchDashboardData();
    fetchOtp();
    const interval = setInterval(fetchOtp, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchOtp = async () => {
    try {
      const res = await api.get('/orders/discount-otp');
      setDiscountOtp(res.data.otp);
    } catch (err) {
      console.error('Failed to fetch OTP', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, attRes, promoRes, prodRes, settRes, prRes] = await Promise.all([
        api.get('/stats'),
        api.get('/attendance/report'),
        api.get('/promotions/all'),
        api.get('/products'),
        api.get('/settings'),
        api.get('/orders/pr')
      ]);
      setStats(statsRes.data);
      setAttendanceLogs(attRes.data);
      setPromotions(promoRes.data);
      setProducts(prodRes.data);
      setSettings(settRes.data);
      setPrOrders(prRes.data);
    } catch (err) {
      console.error('Failed to fetch initial dashboard data', err);
    }
  };

  // --- Filtering Helpers ---
  const filterByTimeRange = (dateString, range) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (range === 'today') {
      return date >= today;
    } else if (range === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return date >= startOfWeek;
    } else if (range === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return date >= startOfMonth;
    }
    return true; // 'all'
  };

  // --- Fetching Specific Tab Data ---
  useEffect(() => {
    if (activeTab === 'Sales History') {
      fetchFilteredSales();
    } else if (activeTab === 'Kitchen & Store') {
      fetchFilteredStore();
    }
  }, [activeTab]);

  const fetchFilteredSales = async () => {
    try {
      let query = '';
      if (reportFilters.startDate && reportFilters.endDate) {
        query = `?startDate=${reportFilters.startDate}&endDate=${reportFilters.endDate}`;
      }
      const res = await api.get(`/finance/sales-report${query}`);
      setSalesHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSort = (key) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.dir === 'asc' ? '↑' : '↓';
  };

  const getFilteredSorted = () => {
    let data = [...salesHistory];

    if (reportFilters.paymentMethod !== 'All') {
      data = data.filter(o => o.paymentMethod === reportFilters.paymentMethod);
    }

    if (reportFilters.cashier) {
      data = data.filter(o => o.salesPersonName?.toLowerCase().includes(reportFilters.cashier.toLowerCase()));
    }

    data.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to permanently delete this transaction? This cannot be undone.')) return;
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Transaction deleted');
      setSalesHistory(prev => prev.filter(o => o._id !== orderId));
      setSelectedOrder(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting transaction');
    }
  };

  const exportSalesReport = () => {
    const data = getFilteredSorted();
    if (data.length === 0) return toast.warning('No data to export');

    const headers = ['Date', 'Order ID', 'Cashier', 'Payment Method', 'Items', 'Subtotal', 'Discount', 'Total'];

    const rows = data.map(order => [
      new Date(order.createdAt).toLocaleString(),
      order._id,
      order.salesPersonName || '',
      order.paymentMethod,
      `"${order.items.map(i => `${i.quantity}x ${i.product?.name || 'Unknown'}`).join('; ')}"`,
      order.subTotalAmount || order.totalAmount,
      order.discountAmount || 0,
      order.totalAmount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchFilteredStore = async () => {
    try {
      const res = await api.get('/transfers');
      const filtered = res.data.filter(t => filterByTimeRange(t.createdAt, storeFilter.timeRange));
      setTransfers(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferAction = async (id, action) => {
    try {
      const managerComment = prompt(`Enter a comment for this ${action.toLowerCase()} (optional):`);
      await api.put(`/transfers/${id}/manager-approve`, { action, managerComment });
      toast.success(`Transfer ${action}d successfully`);
      fetchFilteredStore();
    } catch (err) {
      toast.error('Error updating transfer status');
    }
  };

  // --- Attendance Export ---
  const filteredAttendance = attendanceLogs.filter(log => {
    const matchStaff = attendanceFilter.staff ? log.user?.username === attendanceFilter.staff : true;
    const matchDept = attendanceFilter.dept ? log.user?.role === attendanceFilter.dept : true;
    const matchTime = filterByTimeRange(log.date, attendanceFilter.timeRange);
    return matchStaff && matchDept && matchTime;
  });

  const exportAttendanceToCSV = () => {
    if (filteredAttendance.length === 0) {
      toast.warning('No records to export');
      return;
    }
    const headers = ['Date', 'Staff', 'Department', 'Check In', 'Check Out', 'Status'];
    const rows = filteredAttendance.map(log => [
      new Date(log.date).toLocaleDateString(),
      log.user?.username || 'N/A',
      log.user?.role || 'N/A',
      new Date(log.checkIn).toLocaleTimeString(),
      log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : 'Pending',
      log.status
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PR Approvals ---
  const handlePRAction = async (id, action) => {
    try {
      await api.put(`/orders/${id}/pr`, { action });
      toast.success(`PR Order ${action}d!`);
      // Refresh PR orders and stats
      const [statsRes, prRes] = await Promise.all([api.get('/stats'), api.get('/orders/pr')]);
      setStats(statsRes.data);
      setPrOrders(prRes.data);
    } catch (err) {
      toast.error('Failed to process PR');
    }
  };

  const handleForceCheckout = async (userId) => {
    if (!window.confirm('Are you sure you want to close this shift? The account will be logged out and locked for 8 hours.')) return;
    try {
      await api.post(`/attendance/force-checkout/${userId}`);
      toast.success('Shift closed and account locked');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close shift');
    }
  };

  // --- Menus ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('price', newProduct.price);
    formData.append('category', newProduct.category);
    if (productImage) formData.append('image', productImage);

    try {
      await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewProduct({ name: '', price: '', category: 'FOOD' });
      setProductImage(null);
      fetchDashboardData();
      toast.success('Menu item created');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Error creating product'); 
    }
  };

  const handleUpdateProduct = async (id, e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', editProductData.name);
    formData.append('price', editProductData.price);
    formData.append('category', editProductData.category);
    if (editProductImage) formData.append('image', editProductImage);

    try {
      await api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditingProductId(null);
      setEditProductImage(null);
      fetchDashboardData();
      toast.success('Menu item updated');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Error updating product'); 
    }
  };

  const startEditingProduct = (product) => {
    setEditingProductId(product._id);
    setEditProductData({ name: product.name, price: product.price, category: product.category || 'FOOD' });
    setEditProductImage(null);
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchDashboardData();
    } catch (err) { console.error(err); }
  };

  // --- Promotions (VFD) ---
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!promoMedia) {
      toast.warning('Please select an image or video');
      return;
    }
    const formData = new FormData();
    formData.append('title', newPromo.title);
    formData.append('description', newPromo.description);
    formData.append('order', newPromo.order);
    formData.append('media', promoMedia); // backend expects 'media'

    try {
      await api.post('/promotions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewPromo({ title: '', description: '', order: 0 });
      setPromoMedia(null);
      fetchDashboardData();
      toast.success('Media added to VFD');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Error uploading media'); 
    }
  };

  const togglePromo = async (id) => {
    try {
      await api.put(`/promotions/${id}/toggle`);
      fetchDashboardData();
    } catch (err) { console.error(err); }
  };

  const deletePromo = async (id) => {
    if (!confirm('Delete this media?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      fetchDashboardData();
    } catch (err) { console.error(err); }
  };

  if (!user || (user.role !== 'Manager' && user.role !== 'SuperAdmin')) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  const loggedInUsers = attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString());

  return (
    <div className={styles.managerWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Overview' ? styles.active : ''}`} onClick={() => setActiveTab('Overview')}>
            <span className={styles.icon}>📊</span> Overview
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Sales History' ? styles.active : ''}`} onClick={() => setActiveTab('Sales History')}>
            <span className={styles.icon}>📈</span> Sales History
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Top Sellers' ? styles.active : ''}`} onClick={() => setActiveTab('Top Sellers')}>
            <span className={styles.icon}>🏆</span> Top Sellers
          </button>
        </div>

        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Staff & Attendance' ? styles.active : ''}`} onClick={() => setActiveTab('Staff & Attendance')}>
            <span className={styles.icon}>👥</span> Attendance
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Kitchen & Store' ? styles.active : ''}`} onClick={() => setActiveTab('Kitchen & Store')}>
            <span className={styles.icon}>📦</span> Store Records
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'PR Approvals' ? styles.active : ''}`} onClick={() => setActiveTab('PR Approvals')}>
            <span className={styles.icon}>🤝</span> PR Approvals
          </button>
        </div>

        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'VFD Promotions' ? styles.active : ''}`} onClick={() => setActiveTab('VFD Promotions')}>
            <span className={styles.icon}>📺</span> VFD Media
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Menu Management' ? styles.active : ''}`} onClick={() => setActiveTab('Menu Management')}>
            <span className={styles.icon}>🍔</span> Menu Catalog
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Settings' ? styles.active : ''}`} onClick={() => setActiveTab('Settings')}>
            <span className={styles.icon}>⚙️</span> Settings
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: '#fff', border: '2px solid #f97316', padding: '0.2rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Discount OTP</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f97316', letterSpacing: '2px' }}>{discountOtp}</div>
            </div>
            <button className={styles.btnSecondary} onClick={fetchDashboardData}>
              🔄 Refresh Data
            </button>
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Today's Sales (Valid)</div>
                <div className={styles.statValue}>₦{stats.totalSales?.toLocaleString()}</div>
                <div className={styles.statSub}>{stats.ordersCount} orders</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Customers</div>
                <div className={styles.statValue} style={{ color: '#8b5cf6' }}>{stats.ordersCount}</div>
                <div className={styles.statSub}>Representing today's footfall</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Cash Received (Today)</div>
                <div className={styles.statValue} style={{ color: '#16a34a' }}>₦{stats.cashReceived?.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Bank Payments (Today)</div>
                <div className={styles.statValue} style={{ color: '#2563eb' }}>₦{stats.transferReceived?.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Staff On-site</div>
                <div className={styles.statValue}>{loggedInUsers.length}</div>
                <div className={styles.statSub}>Out of {stats.staffCount} total</div>
              </div>
            </div>

            <div className={styles.twoCol}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Currently Logged In</h2>
                </div>
                <div className={styles.panelBody} style={{ padding: 0 }}>
                  <table className={styles.table}>
                    <thead>
                      <tr><th>Staff</th><th>Dept</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {loggedInUsers.map(log => (
                        <tr key={log._id}>
                          <td>{log.user?.username}</td>
                          <td>{log.user?.role}</td>
                          <td><span className={`${styles.badge} ${styles.badgeGreen}`}>ONLINE</span></td>
                          <td>
                            {log.user?.role === 'Sales' && (
                              <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleForceCheckout(log.user?._id)}>
                                Close Shift
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {loggedInUsers.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No staff currently logged in.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Today's Performance</h2>
                </div>
                <div className={styles.panelBody}>
                  {Object.entries(stats.salesPerStaff || {}).map(([staff, amount]) => (
                    <div key={staff} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 500, color: '#374151' }}>{staff}</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>₦{amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {Object.keys(stats.salesPerStaff || {}).length === 0 && <div className={styles.emptyState}>No sales yet today.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

           {/* SALES HISTORY TAB */}
        {activeTab === 'Sales History' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className={styles.panelTitle}>Transactions Report</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} />
                <span style={{ color: '#64748b' }}>to</span>
                <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} />
                <input type="text" placeholder="Filter Cashier" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.cashier} onChange={e => setReportFilters({...reportFilters, cashier: e.target.value})} />
                <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.paymentMethod} onChange={e => setReportFilters({...reportFilters, paymentMethod: e.target.value})}>
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Transfer</option>
                  <option value="FCMB 1">FCMB 1</option>
                  <option value="FCMB 2">FCMB 2</option>
                  <option value="GT BANK">GT BANK</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Customer Account">Customer Account</option>
                  <option value="PR">PR</option>
                </select>
                <button className={styles.btnSecondary} onClick={fetchFilteredSales} style={{ padding: '0.5rem 1rem' }}>Filter</button>
                <button className={styles.btnPrimary} onClick={exportSalesReport} style={{ padding: '0.5rem 1rem', background: '#10b981', borderColor: '#10b981' }}>📥 Export CSV</button>
              </div>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>Date {getSortIcon('createdAt')}</th>
                    <th>Order ID</th>
                    <th onClick={() => toggleSort('paymentMethod')} style={{ cursor: 'pointer', userSelect: 'none' }}>Payment Method {getSortIcon('paymentMethod')}</th>
                    <th onClick={() => toggleSort('salesPersonName')} style={{ cursor: 'pointer', userSelect: 'none' }}>Cashier {getSortIcon('salesPersonName')}</th>
                    <th>Items</th>
                    <th onClick={() => toggleSort('totalAmount')} style={{ cursor: 'pointer', userSelect: 'none' }}>Total Amount {getSortIcon('totalAmount')}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredSorted().map((order) => (
                    <tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>
                      <td style={{ color: '#64748b' }}>{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td style={{ fontWeight: 600 }}>...{order._id.slice(-6)}</td>
                      <td><span className={`${styles.badge} ${styles.badgeGray}`}>{order.paymentMethod}</span></td>
                      <td>{order.salesPersonName || 'System'}</td>
                      <td style={{ color: '#3b82f6', fontWeight: 600 }}>{order.items.length} items</td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>₦{order.totalAmount?.toLocaleString()}</td>
                      <td>
                        <button className={styles.btnDanger} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order._id); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {getFilteredSorted().length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No transactions found for the selected criteria.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Transaction Detail Modal */}
            {selectedOrder && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Transaction Details</h3>
                    <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <div><span style={{ color: '#64748b' }}>Order ID:</span> <strong>{selectedOrder._id}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date(selectedOrder.createdAt).toLocaleString()}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Payment Method:</span> <strong>{selectedOrder.paymentMethod}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Cashier:</span> <strong>{selectedOrder.salesPersonName || 'N/A'}</strong></div>
                    {selectedOrder.paymentMethod === 'Customer Account' && selectedOrder.customerId && (
                       <div><span style={{ color: '#64748b' }}>Customer ID:</span> <strong>{selectedOrder.customerId}</strong></div>
                    )}
                    {selectedOrder.paymentMethod === 'PR' && (
                       <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b' }}>PR Comment:</span> <strong>{selectedOrder.prComment}</strong></div>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '1rem' }}>Purchased Items</h4>
                  <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.product?.name || 'Unknown Product'}</td>
                          <td>{item.quantity}</td>
                          <td>₦{item.priceAtTime?.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₦{(item.priceAtTime * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Subtotal: ₦{selectedOrder.subTotalAmount?.toLocaleString() || selectedOrder.totalAmount?.toLocaleString()}</div>
                    {selectedOrder.discountAmount > 0 && (
                      <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>Discount: -₦{selectedOrder.discountAmount?.toLocaleString()}</div>
                    )}
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>Grand Total: ₦{selectedOrder.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOP SELLERS TAB */}
        {activeTab === 'Top Sellers' && (() => {
          const allItemsMap = new Map();
          products.forEach(p => {
            allItemsMap.set(p.name, { name: p.name, qty: 0, revenue: 0 });
          });
          stats.topItems?.forEach(t => {
            if (allItemsMap.has(t.name)) {
              allItemsMap.get(t.name).qty = t.qty;
              allItemsMap.get(t.name).revenue = t.revenue;
            } else {
              allItemsMap.set(t.name, { name: t.name, qty: t.qty, revenue: t.revenue });
            }
          });
          const allItemsPerformance = Array.from(allItemsMap.values()).sort((a, b) => b.qty - a.qty);
          
          const top5 = allItemsPerformance.slice(0, 5);
          const lowest5 = [...allItemsPerformance].sort((a, b) => a.qty - b.qty).slice(0, 5);

          return (
            <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className={styles.twoCol}>
                <div className={styles.panel} style={{ marginBottom: 0 }}>
                  <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>Highest Selling (Top 5)</h2>
                  </div>
                  <div className={styles.panelBody}>
                    {top5.map((item, index) => (
                      <div key={item.name} className={styles.topItemRow}>
                        <div className={`${styles.topItemRank} ${index === 0 ? styles.gold : index === 1 ? styles.silver : index === 2 ? styles.bronze : ''}`}>
                          {index + 1}
                        </div>
                        <div className={styles.topItemInfo}>
                          <div className={styles.topItemName}>{item.name}</div>
                          <div className={styles.topItemStats}>Sold: {item.qty} units | Revenue: ₦{item.revenue.toLocaleString()}</div>
                          <div className={styles.topItemBar}>
                            <div className={styles.topItemBarFill} style={{ width: `${Math.min((item.qty / (top5[0]?.qty || 1)) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {top5.length === 0 && <div className={styles.emptyState}>No items sold yet.</div>}
                  </div>
                </div>

                <div className={styles.panel} style={{ marginBottom: 0 }}>
                  <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>Lowest Selling (Bottom 5)</h2>
                  </div>
                  <div className={styles.panelBody}>
                    {lowest5.map((item, index) => (
                      <div key={item.name} className={styles.topItemRow}>
                        <div className={styles.topItemRank} style={{ background: '#94a3b8' }}>
                          {index + 1}
                        </div>
                        <div className={styles.topItemInfo}>
                          <div className={styles.topItemName}>{item.name}</div>
                          <div className={styles.topItemStats}>Sold: {item.qty} units | Revenue: ₦{item.revenue.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    {lowest5.length === 0 && <div className={styles.emptyState}>No items available.</div>}
                  </div>
                </div>
              </div>

              <div className={styles.panel} style={{ marginBottom: 0 }}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>All Items & Selling Rate</h2>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Item Name</th>
                        <th>Units Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItemsPerformance.map((item, index) => (
                        <tr key={item.name}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td>{item.qty}</td>
                          <td style={{ fontWeight: 800 }}>₦{item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                      {allItemsPerformance.length === 0 && (
                        <tr><td colSpan="4" className={styles.emptyState}>No records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* STAFF & ATTENDANCE TAB */}
        {activeTab === 'Staff & Attendance' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.filterBar} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className={styles.filterBtnGroup}>
                  {['today', 'week', 'month', 'all'].map(range => (
                    <button 
                      key={range} 
                      className={`${styles.filterPill} ${attendanceFilter.timeRange === range ? styles.active : ''}`}
                      onClick={() => setAttendanceFilter({...attendanceFilter, timeRange: range})}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
                <select className={styles.filterSelect} value={attendanceFilter.dept} onChange={(e) => setAttendanceFilter({...attendanceFilter, dept: e.target.value})}>
                  <option value="">All Departments</option>
                  <option value="Sales">Sales</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Store">Store</option>
                </select>
                <input 
                  type="text" placeholder="Staff Name" className={styles.filterInput}
                  value={attendanceFilter.staff} onChange={(e) => setAttendanceFilter({...attendanceFilter, staff: e.target.value})}
                />
              </div>
              <button className={styles.btnSuccess} onClick={exportAttendanceToCSV}>
                📥 Export to Excel (CSV)
              </button>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff Name</th>
                    <th>Department</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{log.user?.username}</td>
                      <td>{log.user?.role}</td>
                      <td>{new Date(log.checkIn).toLocaleTimeString()}</td>
                      <td>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : <span style={{color: '#94a3b8'}}>Active</span>}</td>
                      <td>
                        <span className={`${styles.badge} ${log.status === 'Late' ? styles.badgeRed : styles.badgeGreen}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAttendance.length === 0 && <tr><td colSpan="6" className={styles.emptyState}>No attendance records found for these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STORE RECORDS TAB */}
        {activeTab === 'Kitchen & Store' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.filterBar}>
              <div className={styles.filterBtnGroup}>
                {['today', 'week', 'month', 'all'].map(range => (
                  <button 
                    key={range} 
                    className={`${styles.filterPill} ${storeFilter.timeRange === range ? styles.active : ''}`}
                    onClick={() => setStoreFilter({...storeFilter, timeRange: range})}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product Transferred</th>
                    <th>Quantity</th>
                    <th>Kitchen Comment</th>
                    <th>Manager Status</th>
                    <th>Sales Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t._id}>
                      <td>{new Date(t.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{t.product?.name}</td>
                      <td>{t.quantity} {t.unit || 'Units'}</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>{t.kitchenComment || '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${t.managerStatus === 'Approved' ? styles.badgeGreen : t.managerStatus === 'Rejected' ? styles.badgeRed : styles.badgeOrange}`}>
                          {t.managerStatus || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${t.status === 'Accepted' ? styles.badgeGreen : styles.badgeGray}`}>
                          {t.status === 'Accepted' ? 'Accepted by Sales' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {(t.managerStatus === 'Pending' || !t.managerStatus) ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.btnSuccess} onClick={() => handleTransferAction(t._id, 'Approve')}>Approve</button>
                            <button className={styles.btnDanger} onClick={() => handleTransferAction(t._id, 'Reject')}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No store records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PR APPROVALS TAB */}
        {activeTab === 'PR Approvals' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Pending & Processed PR Orders</h2>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff</th>
                    <th>Amount</th>
                    <th>PR Comment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prOrders.map(order => (
                    <tr key={order._id}>
                      <td>{new Date(order.createdAt).toLocaleString()}</td>
                      <td>{order.salesPersonName || order.salesPerson?.username}</td>
                      <td style={{ fontWeight: 800 }}>₦{order.totalAmount.toLocaleString()}</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>"{order.prComment}"</td>
                      <td>
                        <span className={`${styles.badge} ${order.prApproved ? styles.badgeGreen : order.status === 'Declined' ? styles.badgeRed : styles.badgeOrange}`}>
                          {order.prApproved ? 'Approved' : order.status === 'Declined' ? 'Declined' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {!order.prApproved && order.status !== 'Declined' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.btnSuccess} onClick={() => handlePRAction(order._id, 'approve')}>Approve</button>
                            <button className={styles.btnDanger} onClick={() => handlePRAction(order._id, 'decline')}>Decline</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {prOrders.length === 0 && <tr><td colSpan="6" className={styles.emptyState}>No PR orders found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VFD PROMOTIONS TAB */}
        {activeTab === 'VFD Promotions' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Upload VFD Media</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreatePromo} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Title</label>
                    <input type="text" className={styles.formControl} required value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Sort Order</label>
                    <input type="number" className={styles.formControl} value={newPromo.order} onChange={e => setNewPromo({...newPromo, order: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Description</label>
                    <textarea className={styles.formControl} value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} rows={2} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Media File (Image or MP4 Video)</label>
                    <input type="file" accept="image/*,video/mp4,video/quicktime" className={styles.formControl} required onChange={e => setPromoMedia(e.target.files[0])} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className={styles.btnPrimary}>🚀 Upload to VFD</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Active VFD Media</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: '1rem' }}>
                <div className={styles.promoGrid}>
                  {promotions.map(promo => (
                    <div key={promo._id} className={styles.promoCard}>
                      {promo.mediaType === 'video' ? (
                        <video src={promo.imageUrl} className={styles.promoMedia} controls />
                      ) : (
                        <img src={promo.imageUrl} alt="" className={styles.promoMedia} />
                      )}
                      <div className={styles.promoCardBody}>
                        <div className={styles.promoCardTitle}>{promo.title}</div>
                        <div className={styles.promoCardDesc}>{promo.mediaType === 'video' ? '🎥 Video File' : '🖼️ Image File'}</div>
                        <div className={styles.promoCardActions}>
                          <button 
                            className={styles.btnSecondary} 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: promo.isActive ? '#16a34a' : '#e2e8f0', color: promo.isActive ? '#16a34a' : '#64748b' }}
                            onClick={() => togglePromo(promo._id)}
                          >
                            {promo.isActive ? '✅ Active' : '❌ Hidden'}
                          </button>
                          <button className={styles.btnGhost} onClick={() => deletePromo(promo._id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {promotions.length === 0 && <div className={styles.emptyState}>No media uploaded yet.</div>}
              </div>
            </div>
          </div>
        )}

        {/* MENU MANAGEMENT TAB */}
        {activeTab === 'Menu Management' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Create Menu Item</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateProduct} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Item Name</label>
                    <input type="text" className={styles.formControl} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Price (₦)</label>
                    <input type="number" className={styles.formControl} required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Category</label>
                    <select className={styles.formControl} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                      <option value="FOOD">FOOD</option>
                      <option value="PROTEIN">PROTEIN</option>
                      <option value="SOUP">SOUP</option>
                      <option value="SWALLOW">SWALLOW</option>
                      <option value="SIDE">SIDE</option>
                      <option value="DRINK">DRINK</option>
                      <option value="PACK">PACK</option>
                      <option value="ICE CREAM">ICE CREAM</option>
                      <option value="PASTRY">PASTRY</option>
                    </select>
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Item Image (Optional)</label>
                    <input type="file" accept="image/*" className={styles.formControl} onChange={e => setProductImage(e.target.files[0])} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`} style={{ marginTop: '0.5rem' }}>
                    <button type="submit" className={styles.btnPrimary}>➕ Add to Menu Catalog</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Current Menu Catalog</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p._id}>
                        {editingProductId === p._id ? (
                          <td colSpan="4" style={{ padding: '1rem', background: '#f8fafc' }}>
                            <form onSubmit={(e) => handleUpdateProduct(p._id, e)} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                              <input type="text" className={styles.formControl} required value={editProductData.name} onChange={e => setEditProductData({...editProductData, name: e.target.value})} placeholder="Name" style={{ flex: 1, minWidth: '150px' }} />
                              <input type="number" className={styles.formControl} required value={editProductData.price} onChange={e => setEditProductData({...editProductData, price: e.target.value})} placeholder="Price" style={{ width: '100px' }} />
                              <select className={styles.formControl} value={editProductData.category} onChange={e => setEditProductData({...editProductData, category: e.target.value})} style={{ width: '120px' }}>
                                <option value="FOOD">FOOD</option>
                                <option value="PROTEIN">PROTEIN</option>
                                <option value="SOUP">SOUP</option>
                                <option value="SWALLOW">SWALLOW</option>
                                <option value="SIDE">SIDE</option>
                                <option value="DRINK">DRINK</option>
                                <option value="PACK">PACK</option>
                                <option value="ICE CREAM">ICE CREAM</option>
                                <option value="PASTRY">PASTRY</option>
                              </select>
                              <input type="file" accept="image/*" className={styles.formControl} onChange={e => setEditProductImage(e.target.files[0])} style={{ flex: 1, minWidth: '180px', padding: '0.3rem' }} />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className={styles.btnSuccess} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Save</button>
                                <button type="button" className={styles.btnGhost} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => setEditingProductId(null)}>Cancel</button>
                              </div>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td style={{ padding: '0.5rem 1rem' }}>
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '6px' }}></div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td style={{ fontWeight: 800 }}>₦{p.price.toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className={styles.btnSecondary} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => startEditingProduct(p)}>Edit</button>
                                <button className={styles.btnGhost} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => deleteProduct(p._id)}>Delete</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease', maxWidth: '600px' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Store Operations Control</h2>
            </div>
            <div className={styles.panelBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: settings.isMarketOpen ? '#dcfce7' : '#fee2e2', borderRadius: '12px', border: '1px solid', borderColor: settings.isMarketOpen ? '#bbf7d0' : '#fecaca' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Market Status: {settings.isMarketOpen ? 'OPEN' : 'CLOSED'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}>
                    {settings.isMarketOpen 
                      ? 'Customers can place orders online.' 
                      : 'Ordering is disabled. Customers will see a "Closed" message.'}
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const newStatus = !settings.isMarketOpen;
                      await api.put('/settings', { isMarketOpen: newStatus });
                      setSettings({ ...settings, isMarketOpen: newStatus });
                      toast.success(`Market is now ${newStatus ? 'Open' : 'Closed'}`);
                    } catch (err) {
                      toast.error('Failed to update market status');
                    }
                  }}
                  className={settings.isMarketOpen ? styles.btnDanger : styles.btnSuccess}
                >
                  {settings.isMarketOpen ? 'Close Market' : 'Open Market'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
