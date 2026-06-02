"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css'; // Reusing manager styles for consistency
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinanceDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [discountOtp, setDiscountOtp] = useState('----');

  // Financial Data
  const [report, setReport] = useState({ grossRevenue: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: {} });
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [timeRange, setTimeRange] = useState('today');

  // Expense Form
  const [newExpense, setNewExpense] = useState({
    title: '', amount: '', category: 'Operations', receiptNumber: '', notes: ''
  });

  // Customers
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', initialDeposit: '' });
  const [depositData, setDepositData] = useState({ customerId: '', amount: '', notes: '', reference: '' });

  // Vendors
  const [vendors, setVendors] = useState([]);
  const [newVendor, setNewVendor] = useState({ name: '', company: '', phone: '', initialBalance: '' });
  const [vendorTxData, setVendorTxData] = useState({ vendorId: '', type: 'Payment', amount: '', notes: '', reference: '' });

  // Sales Report
  const [salesReportData, setSalesReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', category: 'All', paymentMethod: 'All', cashier: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState(null); // for modal

  // Charts
  const [chartsData, setChartsData] = useState({ trendData: [], paymentMethodChart: [] });
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ef4444'];

  // Active Staff & Attendance
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Menu Management
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'FOOD' });
  const [productImage, setProductImage] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: '', category: 'FOOD' });
  const [editProductImage, setEditProductImage] = useState(null);

  // Advanced Inventory Ledger
  const [ledgerFilters, setLedgerFilters] = useState({ startDate: '', endDate: '', itemId: '' });
  const [ledgerData, setLedgerData] = useState({ openingValue: 0, closingValue: 0, totalInflows: 0, totalOutflows: 0, activities: [] });

  useEffect(() => {
    fetchFinanceData();
  }, [activeTab, timeRange]);

  useEffect(() => {
    fetchOtp();
    const interval = setInterval(fetchOtp, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchOtp = async () => {
    try {
      const res = await api.get('/orders/discount-otp');
      setDiscountOtp(res.data.otp);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinanceData = async () => {
    try {
      if (activeTab === 'Overview') {
        const [res, attRes] = await Promise.all([
          api.get(`/finance/report?timeRange=${timeRange}`),
          api.get('/attendance/report')
        ]);
        setReport(res.data);
        setAttendanceLogs(attRes.data);
      } else if (activeTab === 'Expenses') {
        const res = await api.get('/finance/expenses');
        setExpenses(res.data);
      } else if (activeTab === 'Margin Configuration') {
        const res = await api.get('/inventory');
        setInventory(res.data);
      } else if (activeTab === 'Receivables') {
        const res = await api.get('/customers');
        setCustomers(res.data);
      } else if (activeTab === 'Payables') {
        const res = await api.get('/vendors');
        setVendors(res.data);
      } else if (activeTab === 'Sales Report') {
        let query = '';
        if (reportFilters.startDate && reportFilters.endDate) {
          query = `?startDate=${reportFilters.startDate}&endDate=${reportFilters.endDate}`;
        }
        const res = await api.get(`/finance/sales-report${query}`);
        setSalesReportData(res.data);
      } else if (activeTab === 'Menu Management') {
        const res = await api.get('/products');
        setProducts(res.data);
      } else if (activeTab === 'Graphical Reports') {
        const res = await api.get('/finance/analytics-charts?days=7');
        setChartsData(res.data);
      } else if (activeTab === 'Inventory Ledger') {
        let query = '';
        if (ledgerFilters.startDate && ledgerFilters.endDate) {
          query += `?startDate=${ledgerFilters.startDate}&endDate=${ledgerFilters.endDate}`;
        }
        if (ledgerFilters.itemId) {
          query += (query ? '&' : '?') + `itemId=${ledgerFilters.itemId}`;
        }
        const [invRes, ledgRes] = await Promise.all([
          api.get('/inventory'),
          api.get(`/inventory/ledger${query}`)
        ]);
        setInventory(invRes.data);
        setLedgerData(ledgRes.data);
      }
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load finance data');
      setLoading(false);
    }
  };

  const handleForceCheckout = async (userId) => {
    if (!window.confirm('Are you sure you want to close this shift? The account will be logged out and locked for 8 hours.')) return;
    try {
      await api.post(`/attendance/force-checkout/${userId}`);
      toast.success('Shift closed and account locked');
      fetchFinanceData();
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
      fetchFinanceData();
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
      fetchFinanceData();
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
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchFinanceData();
    } catch (err) { console.error(err); }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/expenses', newExpense);
      toast.success('Expense logged successfully');
      setNewExpense({ title: '', amount: '', category: 'Operations', receiptNumber: '', notes: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error('Error logging expense');
    }
  };

  const handleMarginUpdate = async (id, newMargin) => {
    try {
      await api.put(`/finance/margins/${id}`, { marginPercentage: Number(newMargin) });
      toast.success('Margin updated');
      fetchFinanceData();
    } catch (err) {
      toast.error('Error updating margin');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      toast.success('Customer account created');
      setNewCustomer({ name: '', phone: '', initialDeposit: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating customer');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositData.customerId) return toast.error('Select a customer');
    try {
      await api.post(`/customers/${depositData.customerId}/deposit`, depositData);
      toast.success('Deposit logged successfully');
      setDepositData({ customerId: '', amount: '', notes: '', reference: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error logging deposit');
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vendors', newVendor);
      toast.success('Vendor account created');
      setNewVendor({ name: '', company: '', phone: '', initialBalance: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating vendor');
    }
  };

  const handleVendorTx = async (e) => {
    e.preventDefault();
    if (!vendorTxData.vendorId) return toast.error('Select a vendor');
    try {
      await api.post(`/vendors/${vendorTxData.vendorId}/transaction`, vendorTxData);
      toast.success('Transaction logged successfully');
      setVendorTxData({ vendorId: '', type: 'Payment', amount: '', notes: '', reference: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error logging transaction');
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
    let data = [...salesReportData];

    // Filter by payment method
    if (reportFilters.paymentMethod !== 'All') {
      data = data.filter(o => o.paymentMethod === reportFilters.paymentMethod);
    }

    if (reportFilters.cashier) {
      data = data.filter(o => o.salesPersonName?.toLowerCase().includes(reportFilters.cashier.toLowerCase()));
    }

    // Sort
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
      setSalesReportData(prev => prev.filter(o => o._id !== orderId));
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
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user || !['Finance', 'SuperAdmin'].includes(user.role)) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading Finance Dashboard...</div>;

  return (
    <div className={styles.managerWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Overview' ? styles.active : ''}`} onClick={() => setActiveTab('Overview')}>
            <span className={styles.icon}>📊</span> Financial Overview
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Receivables' ? styles.active : ''}`} onClick={() => setActiveTab('Receivables')}>
            <span className={styles.icon}>📓</span> Receivable Journal
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Payables' ? styles.active : ''}`} onClick={() => setActiveTab('Payables')}>
            <span className={styles.icon}>🏭</span> Payable Journal
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Sales Report' ? styles.active : ''}`} onClick={() => setActiveTab('Sales Report')}>
            <span className={styles.icon}>📈</span> Sales Report
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Expenses' ? styles.active : ''}`} onClick={() => setActiveTab('Expenses')}>
            <span className={styles.icon}>🧾</span> Outgoing Costs
          </button>
        </div>

        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'Menu Management' ? styles.active : ''}`} onClick={() => setActiveTab('Menu Management')}>
            <span className={styles.icon}>🍔</span> Menu Management
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Graphical Reports' ? styles.active : ''}`} onClick={() => setActiveTab('Graphical Reports')}>
            <span className={styles.icon}>📊</span> Graphical Reports
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Inventory Ledger' ? styles.active : ''}`} onClick={() => setActiveTab('Inventory Ledger')}>
            <span className={styles.icon}>📚</span> Inventory Ledger
          </button>
        </div>

        {user.role === 'SuperAdmin' && (
          <div className={styles.navGroup}>
            <button className={`${styles.navBtn} ${activeTab === 'Margin Configuration' ? styles.active : ''}`} onClick={() => setActiveTab('Margin Configuration')}>
              <span className={styles.icon}>⚙️</span> Margin Configuration
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
            <p className={styles.pageSubtitle}>Welcome back, {user.username}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: '#fff', border: '2px solid #f97316', padding: '0.2rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Discount OTP</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f97316', letterSpacing: '2px' }}>{discountOtp}</div>
            </div>
            <button className={styles.btnSecondary} onClick={fetchFinanceData}>
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Today's Sales (Valid)</div>
                <div className={styles.statValue}>₦{report?.totalSales?.toLocaleString()}</div>
                <div className={styles.statSub}>{report?.ordersCount} orders</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Customers</div>
                <div className={styles.statValue} style={{ color: '#8b5cf6' }}>{report?.ordersCount}</div>
                <div className={styles.statSub}>Representing today's footfall</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Cash Received (Today)</div>
                <div className={styles.statValue} style={{ color: '#16a34a' }}>₦{report?.cashReceived?.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Bank Payments (Today)</div>
                <div className={styles.statValue} style={{ color: '#2563eb' }}>₦{report?.transferReceived?.toLocaleString()}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Active Staff On-site</div>
                <div className={styles.statValue}>{attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString()).length}</div>
                <div className={styles.statSub}>Out of {report?.staffCount || 0} total</div>
              </div>
            </div>

            {/* Bank Channel Breakdown */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #0ea5e9' }}>
                <div className={styles.statLabel}>FCMB 1 (Today)</div>
                <div className={styles.statValue} style={{ color: '#0ea5e9' }}>₦{(report?.fcmb1Total || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #6366f1' }}>
                <div className={styles.statLabel}>FCMB 2 (Today)</div>
                <div className={styles.statValue} style={{ color: '#6366f1' }}>₦{(report?.fcmb2Total || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className={styles.statLabel}>GT BANK (Today)</div>
                <div className={styles.statValue} style={{ color: '#f59e0b' }}>₦{(report?.gtbankTotal || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #ef4444' }}>
                <div className={styles.statLabel}>PR Orders (Today)</div>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>₦{(report?.prTotal || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Privilege / complimentary</div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Currently Logged In (Active Cashiers)</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Staff</th><th>Dept</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString()).map(log => (
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
                    {attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString()).length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No staff currently logged in.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RECEIVABLES TAB */}
        {activeTab === 'Receivables' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Create Customer Account</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateCustomer} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Customer Name</label>
                    <input type="text" className={styles.formControl} required value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone Number</label>
                    <input type="text" className={styles.formControl} required value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Initial Deposit (₦)</label>
                    <input type="number" className={styles.formControl} value={newCustomer.initialDeposit} onChange={e => setNewCustomer({...newCustomer, initialDeposit: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%' }}>Create Account</button>
                  </div>
                </form>
              </div>

              <div className={styles.panelHeader} style={{ marginTop: '2rem' }}>
                <h2 className={styles.panelTitle}>Log Advance Payment (Deposit)</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleDeposit} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Select Customer</label>
                    <select className={styles.formControl} required value={depositData.customerId} onChange={e => setDepositData({...depositData, customerId: e.target.value})}>
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.phone}) - Bal: ₦{c.walletBalance}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={depositData.amount} onChange={e => setDepositData({...depositData, amount: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ref / Receipt</label>
                    <input type="text" className={styles.formControl} value={depositData.reference} onChange={e => setDepositData({...depositData, reference: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Notes</label>
                    <input type="text" className={styles.formControl} value={depositData.notes} onChange={e => setDepositData({...depositData, notes: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: '#16a34a', borderColor: '#16a34a' }}>Log Deposit</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Receivable Accounts Ledger</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Wallet Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.phone}</td>
                        <td style={{ fontWeight: 800, color: c.walletBalance > 0 ? '#16a34a' : '#475569' }}>₦{c.walletBalance?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {customers.length === 0 && <tr><td colSpan="3" className={styles.emptyState}>No customer accounts.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PAYABLES TAB */}
        {activeTab === 'Payables' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Create Vendor Account</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateVendor} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Contact Name</label>
                    <input type="text" className={styles.formControl} required value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Company</label>
                    <input type="text" className={styles.formControl} value={newVendor.company} onChange={e => setNewVendor({...newVendor, company: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone Number</label>
                    <input type="text" className={styles.formControl} value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Initial Balance Owed (₦)</label>
                    <input type="number" className={styles.formControl} value={newVendor.initialBalance} onChange={e => setNewVendor({...newVendor, initialBalance: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: '#6366f1', borderColor: '#6366f1' }}>Create Vendor</button>
                  </div>
                </form>
              </div>

              <div className={styles.panelHeader} style={{ marginTop: '2rem' }}>
                <h2 className={styles.panelTitle}>Log Vendor Transaction</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleVendorTx} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Select Vendor</label>
                    <select className={styles.formControl} required value={vendorTxData.vendorId} onChange={e => setVendorTxData({...vendorTxData, vendorId: e.target.value})}>
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => (
                        <option key={v._id} value={v._id}>{v.name} ({v.company}) - Owed: ₦{v.balanceOwed}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Transaction Type</label>
                    <select className={styles.formControl} value={vendorTxData.type} onChange={e => setVendorTxData({...vendorTxData, type: e.target.value})}>
                      <option value="Payment">Payment (Reduce Owed)</option>
                      <option value="Invoice">Invoice (Increase Owed)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={vendorTxData.amount} onChange={e => setVendorTxData({...vendorTxData, amount: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ref / Receipt</label>
                    <input type="text" className={styles.formControl} value={vendorTxData.reference} onChange={e => setVendorTxData({...vendorTxData, reference: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <input type="text" className={styles.formControl} value={vendorTxData.notes} onChange={e => setVendorTxData({...vendorTxData, notes: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: vendorTxData.type === 'Payment' ? '#16a34a' : '#ef4444', borderColor: vendorTxData.type === 'Payment' ? '#16a34a' : '#ef4444' }}>
                      Log {vendorTxData.type}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Payables Ledger</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Company</th>
                      <th>Balance Owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map(v => (
                      <tr key={v._id}>
                        <td style={{ fontWeight: 600 }}>{v.name}</td>
                        <td>{v.company}</td>
                        <td style={{ fontWeight: 800, color: v.balanceOwed > 0 ? '#ef4444' : '#475569' }}>₦{v.balanceOwed?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {vendors.length === 0 && <tr><td colSpan="3" className={styles.emptyState}>No vendor accounts.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SALES REPORT TAB */}
        {activeTab === 'Sales Report' && (
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
                <button className={styles.btnSecondary} onClick={fetchFinanceData} style={{ padding: '0.5rem 1rem' }}>Filter</button>
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
                      <td>{order.salesPersonName || order.salesPerson?.username || 'System'}</td>
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
                    <div><span style={{ color: '#64748b' }}>Cashier:</span> <strong>{selectedOrder.salesPersonName || selectedOrder.salesPerson?.username || 'N/A'}</strong></div>
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

        {/* OVERVIEW TAB */}
        {activeTab === 'Overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.filterBar}>
              <div className={styles.filterBtnGroup}>
                {['today', 'week', 'month', 'all'].map(range => (
                  <button 
                    key={range} 
                    className={`${styles.filterPill} ${timeRange === range ? styles.active : ''}`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className={styles.statLabel}>Gross Sales Revenue</div>
                <div className={styles.statValue} style={{ color: '#1e293b' }}>₦{report.grossRevenue?.toLocaleString()}</div>
                <div className={styles.statSub}>From {report.ordersCount} POS orders</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #ef4444' }}>
                <div className={styles.statLabel}>Total Expenses Logged</div>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>₦{report.totalExpenses?.toLocaleString()}</div>
                <div className={styles.statSub}>{report.expensesCount} expense records</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                <div className={styles.statLabel}>Net Profit (Est.)</div>
                <div className={styles.statValue} style={{ color: '#10b981' }}>₦{report.netProfit?.toLocaleString()}</div>
                <div className={styles.statSub}>Revenue minus logged expenses</div>
              </div>
            </div>

            <div className={styles.panel} style={{ marginTop: '2rem' }}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Expenses Breakdown by Category</h2>
              </div>
              <div className={styles.panelBody}>
                {Object.keys(report.expensesByCategory || {}).length === 0 ? (
                  <div className={styles.emptyState}>No expenses logged for this period.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(report.expensesByCategory).map(([cat, amount]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{cat}</span>
                        <span style={{ fontWeight: 800, color: '#ef4444' }}>₦{amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'Expenses' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Log Outgoing Cost / Receipt</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleExpenseSubmit} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Expense Title / Description</label>
                    <input type="text" className={styles.formControl} required value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} placeholder="e.g. Generator Fuel, Staff Bonus" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category</label>
                    <select className={styles.formControl} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                      <option value="Operations">Operations</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Purchases">Inventory Purchases</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Receipt / Invoice No. (Optional)</label>
                    <input type="text" className={styles.formControl} value={newExpense.receiptNumber} onChange={e => setNewExpense({...newExpense, receiptNumber: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Additional Notes</label>
                    <textarea className={styles.formControl} value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} rows="2"></textarea>
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%' }}>💾 Save Expense Record</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Expense Ledger</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Details</th>
                      <th>Category</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.slice(0, 15).map(exp => (
                      <tr key={exp._id}>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(exp.date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{exp.title}</div>
                          {exp.receiptNumber && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Receipt: {exp.receiptNumber}</div>}
                        </td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{exp.category}</span></td>
                        <td style={{ fontWeight: 800, color: '#ef4444' }}>₦{exp.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No expenses logged yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MARGIN CONFIGURATION TAB (Admin Only) */}
        {activeTab === 'Margin Configuration' && user.role === 'SuperAdmin' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Bulk Supply Margin Settings</h2>
            </div>
            <div className={styles.panelBody} style={{ padding: '1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.9rem' }}>
              Set the desired Profit Margin % for bulk supplies. The system will automatically calculate the retail Unit Cost based on the average landing cost of the item.
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Base Unit</th>
                    <th>Landing Cost/Unit</th>
                    <th>Profit Margin (%)</th>
                    <th>Calculated Retail Price</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                      <td>{item.unit}</td>
                      <td>₦{item.averageCostPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>
                        <input 
                          type="number" 
                          defaultValue={item.marginPercentage || 0}
                          style={{ width: '80px', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== item.marginPercentage) {
                              handleMarginUpdate(item._id, e.target.value);
                            }
                          }}
                        /> %
                      </td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>
                        ₦{(item.retailPricePerUnit || item.averageCostPerUnit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {inventory.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No items in inventory.</td></tr>}
                </tbody>
              </table>
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
                    <button type="submit" className={styles.btnPrimary}>Create Item</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Active Menu Items</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name & Category</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product._id}>
                        <td>
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 40, height: 40, background: '#e2e8f0', borderRadius: 4 }}></div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{product.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.category}</div>
                        </td>
                        <td style={{ fontWeight: 800 }}>₦{product.price.toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.btnSecondary} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => startEditingProduct(product)}>Edit</button>
                            <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => deleteProduct(product._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="4" className={styles.emptyState}>No items in catalog.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Product Modal */}
            {editingProductId && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1e293b' }}>Edit Menu Item</h3>
                  <form onSubmit={(e) => handleUpdateProduct(editingProductId, e)} className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.full}`}>
                      <label className={styles.formLabel}>Item Name</label>
                      <input type="text" className={styles.formControl} required value={editProductData.name} onChange={e => setEditProductData({...editProductData, name: e.target.value})} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.full}`}>
                      <label className={styles.formLabel}>Price (₦)</label>
                      <input type="number" className={styles.formControl} required value={editProductData.price} onChange={e => setEditProductData({...editProductData, price: e.target.value})} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.full}`}>
                      <label className={styles.formLabel}>Category</label>
                      <select className={styles.formControl} value={editProductData.category} onChange={e => setEditProductData({...editProductData, category: e.target.value})}>
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
                      <label className={styles.formLabel}>New Image (Optional)</label>
                      <input type="file" accept="image/*" className={styles.formControl} onChange={e => setEditProductImage(e.target.files[0])} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.full}`} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button type="button" className={styles.btnGhost} style={{ flex: 1 }} onClick={() => setEditingProductId(null)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} style={{ flex: 1 }}>Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GRAPHICAL REPORTS TAB */}
        {activeTab === 'Graphical Reports' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* 7-Day Trend Chart */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>7-Day Revenue vs Expenses Trend</h2>
              </div>
              <div className={styles.panelBody} style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#059669" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.twoCol}>
              {/* Payment Method Breakdown - Pie Chart */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Sales by Payment Method (Pie)</h2>
                </div>
                <div className={styles.panelBody} style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartsData.paymentMethodChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartsData.paymentMethodChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Method Breakdown - Bar Chart */}
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Sales by Payment Method (Bar)</h2>
                </div>
                <div className={styles.panelBody} style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.paymentMethodChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                      <Bar dataKey="value" name="Total Amount" fill="#3b82f6">
                        {chartsData.paymentMethodChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY LEDGER TAB */}
        {activeTab === 'Inventory Ledger' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className={styles.panelTitle}>Advanced Inventory Ledger</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.startDate} onChange={e => setLedgerFilters({...ledgerFilters, startDate: e.target.value})} />
                  <span style={{ color: '#64748b' }}>to</span>
                  <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.endDate} onChange={e => setLedgerFilters({...ledgerFilters, endDate: e.target.value})} />
                  
                  <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.itemId} onChange={e => setLedgerFilters({...ledgerFilters, itemId: e.target.value})}>
                    <option value="">All Items</option>
                    {inventory.map(item => (
                      <option key={item._id} value={item._id}>{item.itemName} ({item.unit})</option>
                    ))}
                  </select>

                  <button className={styles.btnSecondary} onClick={fetchFinanceData} style={{ padding: '0.5rem 1rem' }}>Generate Ledger</button>
                </div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ background: '#f8fafc' }}>
                <div className={styles.statLabel}>Opening Value</div>
                <div className={styles.statValue}>₦{(ledgerData.openingValue || 0).toLocaleString()}</div>
                <div className={styles.statSub}>At start date</div>
              </div>
              <div className={styles.statCard} style={{ background: '#ecfdf5', borderColor: '#10b981' }}>
                <div className={styles.statLabel}>Closing Value</div>
                <div className={styles.statValue} style={{ color: '#059669' }}>₦{(ledgerData.closingValue || 0).toLocaleString()}</div>
                <div className={styles.statSub}>At end date</div>
              </div>
              <div className={styles.statCard} style={{ background: '#eff6ff', borderColor: '#3b82f6' }}>
                <div className={styles.statLabel}>Total Inflows (Supplies/Returns)</div>
                <div className={styles.statValue} style={{ color: '#2563eb' }}>₦{(ledgerData.totalInflows || 0).toLocaleString()}</div>
              </div>
              <div className={styles.statCard} style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
                <div className={styles.statLabel}>Total Outflows (Transfers)</div>
                <div className={styles.statValue} style={{ color: '#dc2626' }}>₦{(ledgerData.totalOutflows || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Type</th>
                      <th>Item</th>
                      <th>Qty Change</th>
                      <th>Value Impact</th>
                      <th>Actor</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.activities.map((act, i) => (
                      <tr key={act.id || i}>
                        <td>{new Date(act.date).toLocaleString()}</td>
                        <td>
                          <span className={styles.badge} style={{ 
                            background: act.type === 'Supply' ? '#dbeafe' : act.type === 'Kitchen Request' ? '#fee2e2' : '#dcfce3',
                            color: act.type === 'Supply' ? '#1e40af' : act.type === 'Kitchen Request' ? '#991b1b' : '#166534'
                          }}>
                            {act.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{act.itemName}</td>
                        <td style={{ fontWeight: 700, color: act.qtyChange > 0 ? '#16a34a' : '#ef4444' }}>
                          {act.qtyChange > 0 ? '+' : ''}{act.qtyChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ color: act.valueChange > 0 ? '#16a34a' : '#ef4444' }}>
                          ₦{act.valueChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td>{act.actor}</td>
                        <td>{act.notes}</td>
                      </tr>
                    ))}
                    {ledgerData.activities.length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No activities in this period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
