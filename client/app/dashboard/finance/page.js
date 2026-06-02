"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PAYMENT_ACCOUNTS = ['Cash', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK', 'Petty Cash'];
const ACCOUNT_COLORS = {
  'Cash':       { bg: '#ecfdf5', text: '#059669', border: '#10b981', icon: '💵' },
  'FCMB 1':     { bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6', icon: '🏦' },
  'FCMB 2':     { bg: '#eef2ff', text: '#4338ca', border: '#6366f1', icon: '🏦' },
  'Nomba':      { bg: '#f0fdf4', text: '#15803d', border: '#22c55e', icon: '📱' },
  'GT BANK':    { bg: '#fff7ed', text: '#c2410c', border: '#f97316', icon: '🏛️' },
  'Petty Cash': { bg: '#fefce8', text: '#a16207', border: '#eab308', icon: '🪙' },
};

export default function FinanceDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [discountOtp, setDiscountOtp] = useState('----');

  // Financial Data
  const [report, setReport]       = useState({ grossRevenue: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: {} });
  const [expenses, setExpenses]   = useState([]);
  const [inventory, setInventory] = useState([]);
  const [timeRange, setTimeRange] = useState('today');

  // Chart of Accounts
  const [accounts, setAccounts]       = useState([]);
  const [receivables, setReceivables] = useState(0);
  const [payables, setPayables]       = useState(0);

  // Inter-Account Transfers
  const [transfers, setTransfers]     = useState([]);
  const [newTransfer, setNewTransfer] = useState({ fromAccount: 'Cash', toAccount: 'Petty Cash', amount: '', comment: '' });
  const [transferLoading, setTransferLoading] = useState(false);

  // Expense Form — enhanced with paymentAccount + edit support
  const BLANK_EXPENSE = { title: '', amount: '', category: 'Operations', paymentAccount: 'Cash', receiptNumber: '', notes: '' };
  const [newExpense, setNewExpense]       = useState(BLANK_EXPENSE);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Customers & Vendors
  const [customers, setCustomers]       = useState([]);
  const [newCustomer, setNewCustomer]   = useState({ name: '', phone: '', initialDeposit: '' });
  const [depositData, setDepositData]   = useState({ customerId: '', amount: '', notes: '', reference: '' });
  const [vendors, setVendors]           = useState([]);
  const [newVendor, setNewVendor]       = useState({ name: '', company: '', phone: '', initialBalance: '' });
  const [vendorTxData, setVendorTxData] = useState({ vendorId: '', type: 'Payment', amount: '', notes: '', reference: '' });

  // Sales Report
  const [salesReportData, setSalesReportData] = useState([]);
  const [reportFilters, setReportFilters]     = useState({ startDate: '', endDate: '', category: 'All', paymentMethod: 'All', cashier: '' });
  const [sortConfig, setSortConfig]           = useState({ key: 'createdAt', dir: 'desc' });
  const [selectedOrder, setSelectedOrder]     = useState(null);

  // General Ledger (Transactions)
  const [ledgerTxns, setLedgerTxns]           = useState([]);
  const [ledgerLoading, setLedgerLoading]     = useState(false);
  const [ledgerFiltersG, setLedgerFiltersG]   = useState({ startDate: '', endDate: '', type: '', account: '', category: '', cashier: '' });
  const [ledgerSort, setLedgerSort]           = useState({ key: 'date', dir: 'desc' });

  // Charts
  const [chartsData, setChartsData] = useState({ trendData: [], paymentMethodChart: [] });
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8b5cf6', '#ef4444'];

  // Attendance
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Menu Management
  const [products, setProducts]               = useState([]);
  const [newProduct, setNewProduct]           = useState({ name: '', price: '', category: 'FOOD' });
  const [productImage, setProductImage]       = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductData, setEditProductData]   = useState({ name: '', price: '', category: 'FOOD' });
  const [editProductImage, setEditProductImage] = useState(null);

  // Inventory Ledger
  const [ledgerFilters, setLedgerFilters] = useState({ startDate: '', endDate: '', itemId: '' });
  const [ledgerData, setLedgerData]       = useState({ openingValue: 0, closingValue: 0, totalInflows: 0, totalOutflows: 0, activities: [] });

  useEffect(() => { fetchFinanceData(); }, [activeTab, timeRange]);
  useEffect(() => {
    fetchOtp();
    const interval = setInterval(fetchOtp, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchOtp = async () => {
    try {
      const res = await api.get('/orders/discount-otp');
      setDiscountOtp(res.data.otp);
    } catch (err) { console.error(err); }
  };

  const fetchFinanceData = async () => {
    try {
      if (activeTab === 'Overview') {
        const [res, attRes, acctRes, txRes] = await Promise.all([
          api.get(`/finance/report?timeRange=${timeRange}`),
          api.get('/attendance/report'),
          api.get('/finance/accounts'),
          api.get('/finance/transfers')
        ]);
        setReport(res.data);
        setAttendanceLogs(attRes.data);
        setAccounts(acctRes.data.accounts || []);
        setReceivables(acctRes.data.receivables || 0);
        setPayables(acctRes.data.payables || 0);
        setTransfers(txRes.data || []);
      } else if (activeTab === 'Expenses') {
        const [expRes, acctRes] = await Promise.all([
          api.get('/finance/expenses'),
          api.get('/finance/accounts')
        ]);
        setExpenses(expRes.data);
        setAccounts(acctRes.data.accounts || []);
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
        if (ledgerFilters.itemId) query += (query ? '&' : '?') + `itemId=${ledgerFilters.itemId}`;
        const [invRes, ledgRes] = await Promise.all([api.get('/inventory'), api.get(`/inventory/ledger${query}`)]);
        setInventory(invRes.data);
        setLedgerData(ledgRes.data);
      } else if (activeTab === 'General Ledger') {
        fetchGeneralLedger();
      }
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load finance data');
      setLoading(false);
    }
  };

  const fetchGeneralLedger = async () => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      if (ledgerFiltersG.startDate) params.append('startDate', ledgerFiltersG.startDate);
      if (ledgerFiltersG.endDate)   params.append('endDate',   ledgerFiltersG.endDate);
      if (ledgerFiltersG.type)      params.append('type',      ledgerFiltersG.type);
      if (ledgerFiltersG.account)   params.append('account',   ledgerFiltersG.account);
      if (ledgerFiltersG.category)  params.append('category',  ledgerFiltersG.category);
      if (ledgerFiltersG.cashier)   params.append('cashier',   ledgerFiltersG.cashier);
      const res = await api.get(`/finance/transactions?${params.toString()}`);
      setLedgerTxns(res.data);
    } catch (err) {
      toast.error('Failed to load general ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  // ── Inter-Account Transfer ──────────────────────────────────
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!newTransfer.amount || Number(newTransfer.amount) <= 0) return toast.error('Enter a valid transfer amount');
    if (newTransfer.fromAccount === newTransfer.toAccount) return toast.error('Cannot transfer to the same account');
    setTransferLoading(true);
    try {
      await api.post('/finance/transfers', { ...newTransfer, amount: Number(newTransfer.amount) });
      toast.success(`₦${Number(newTransfer.amount).toLocaleString()} transferred from ${newTransfer.fromAccount} → ${newTransfer.toAccount}`);
      setNewTransfer({ fromAccount: 'Cash', toAccount: 'Petty Cash', amount: '', comment: '' });
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  // ── Expenses ───────────────────────────────────────────────
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpenseSubmitting(true);
    try {
      if (editingExpenseId) {
        await api.put(`/finance/expenses/${editingExpenseId}`, newExpense);
        toast.success('Expense updated — balances corrected');
        setEditingExpenseId(null);
      } else {
        await api.post('/finance/expenses', newExpense);
        toast.success('Expense logged successfully');
      }
      setNewExpense(BLANK_EXPENSE);
      fetchFinanceData();
    } catch (err) {
      toast.error('Error saving expense');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp._id);
    setNewExpense({
      title: exp.title, amount: exp.amount, category: exp.category,
      paymentAccount: exp.paymentAccount || 'Cash',
      receiptNumber: exp.receiptNumber || '', notes: exp.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Reverse and permanently delete this expense? The deducted amount will be restored to the account balance.')) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      toast.success('Expense reversed successfully');
      fetchFinanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting expense');
    }
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setNewExpense(BLANK_EXPENSE);
  };

  // ── Margin / Menu / Customers / Vendors ────────────────────
  const handleMarginUpdate = async (id, newMargin) => {
    try {
      await api.put(`/finance/margins/${id}`, { marginPercentage: Number(newMargin) });
      toast.success('Margin updated');
      fetchFinanceData();
    } catch (err) { toast.error('Error updating margin'); }
  };

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
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating product'); }
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
    } catch (err) { toast.error(err.response?.data?.message || 'Error updating product'); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await api.delete(`/products/${id}`); fetchFinanceData(); } catch (err) { console.error(err); }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      toast.success('Customer account created');
      setNewCustomer({ name: '', phone: '', initialDeposit: '' });
      fetchFinanceData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating customer'); }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositData.customerId) return toast.error('Select a customer');
    try {
      await api.post(`/customers/${depositData.customerId}/deposit`, depositData);
      toast.success('Deposit logged successfully');
      setDepositData({ customerId: '', amount: '', notes: '', reference: '' });
      fetchFinanceData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error logging deposit'); }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vendors', newVendor);
      toast.success('Vendor account created');
      setNewVendor({ name: '', company: '', phone: '', initialBalance: '' });
      fetchFinanceData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error creating vendor'); }
  };

  const handleVendorTx = async (e) => {
    e.preventDefault();
    if (!vendorTxData.vendorId) return toast.error('Select a vendor');
    try {
      await api.post(`/vendors/${vendorTxData.vendorId}/transaction`, vendorTxData);
      toast.success('Transaction logged successfully');
      setVendorTxData({ vendorId: '', type: 'Payment', amount: '', notes: '', reference: '' });
      fetchFinanceData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error logging transaction'); }
  };

  const handleForceCheckout = async (userId) => {
    if (!window.confirm('Are you sure you want to close this shift?')) return;
    try {
      await api.post(`/attendance/force-checkout/${userId}`);
      toast.success('Shift closed and account locked');
      fetchFinanceData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to close shift'); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Permanently delete this transaction? This cannot be undone.')) return;
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Transaction deleted');
      setSalesReportData(prev => prev.filter(o => o._id !== orderId));
      setSelectedOrder(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Error deleting transaction'); }
  };

  // ── Sorting helpers ────────────────────────────────────────
  const toggleSort = (key) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const getSortIcon = (key) => sortConfig.key !== key ? '↕' : sortConfig.dir === 'asc' ? '↑' : '↓';

  const toggleLedgerSort = (key) => setLedgerSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const getLedgerSortIcon = (key) => ledgerSort.key !== key ? '↕' : ledgerSort.dir === 'asc' ? '↑' : '↓';

  const getFilteredSorted = () => {
    let data = [...salesReportData];
    if (reportFilters.paymentMethod !== 'All') data = data.filter(o => o.paymentMethod === reportFilters.paymentMethod);
    if (reportFilters.cashier) data = data.filter(o => (o.salesPersonName || o.salesPerson?.username || '').toLowerCase().includes(reportFilters.cashier.toLowerCase()));
    data.sort((a, b) => {
      let aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (sortConfig.key === 'createdAt') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  };

  const getSortedLedger = () => {
    let data = [...ledgerTxns];
    data.sort((a, b) => {
      let aVal = a[ledgerSort.key], bVal = b[ledgerSort.key];
      if (ledgerSort.key === 'date') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return ledgerSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return ledgerSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  };

  // ── CSV Export ─────────────────────────────────────────────
  const exportSalesReport = () => {
    const data = getFilteredSorted();
    if (!data.length) return toast.warning('No data to export');
    const headers = ['Date', 'Order ID', 'Cashier', 'Payment Method', 'Items', 'Subtotal', 'Discount', 'Total'];
    const rows = data.map(o => [
      new Date(o.createdAt).toLocaleString(), o._id,
      o.salesPersonName || o.salesPerson?.username || '', o.paymentMethod,
      `"${o.items.map(i => `${i.quantity}x ${i.product?.name || 'Unknown'}`).join('; ')}"`,
      o.subTotalAmount || o.totalAmount, o.discountAmount || 0, o.totalAmount
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csv));
    a.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const exportGeneralLedger = () => {
    const data = getSortedLedger();
    if (!data.length) return toast.warning('No data to export');
    const headers = ['Date', 'Type', 'Flow', 'Description', 'Category', 'Account', 'Amount', 'Cashier', 'Reference'];
    const rows = data.map(t => [
      new Date(t.date).toLocaleString(), t.type, t.flowType,
      `"${t.description}"`, t.category, t.account, t.amount, t.cashier, t.ref || ''
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.setAttribute('href', encodeURI(csv));
    a.setAttribute('download', `general_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (!user || !['Finance', 'SuperAdmin'].includes(user.role)) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }
  if (loading) return <div style={{ padding: '2rem' }}>Loading Finance Dashboard...</div>;

  // ── Total balances for ledger summary ─────────────────────
  const ledgerInflows  = ledgerTxns.filter(t => t.flowType === 'Inflow').reduce((s, t) => s + t.amount, 0);
  const ledgerOutflows = ledgerTxns.filter(t => t.flowType === 'Outflow').reduce((s, t) => s + t.amount, 0);
  const ledgerNet      = ledgerInflows - ledgerOutflows;

  const TABS = [
    { id: 'Overview',        icon: '📊', label: 'Financial Overview' },
    { id: 'Expenses',        icon: '🧾', label: 'Outgoing Costs' },
    { id: 'General Ledger',  icon: '📒', label: 'General Ledger' },
    { id: 'Receivables',     icon: '📓', label: 'Receivable Journal' },
    { id: 'Payables',        icon: '🏭', label: 'Payable Journal' },
    { id: 'Sales Report',    icon: '📈', label: 'Sales Report' },
    { id: 'Menu Management', icon: '🍔', label: 'Menu Management' },
    { id: 'Graphical Reports', icon: '📉', label: 'Graphical Reports' },
    { id: 'Inventory Ledger', icon: '📚', label: 'Inventory Ledger' },
    ...(user.role === 'SuperAdmin' ? [{ id: 'Margin Configuration', icon: '⚙️', label: 'Margin Config' }] : []),
  ];

  return (
    <div className={styles.managerWrapper}>
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          {TABS.slice(0, 5).map(t => (
            <button key={t.id} className={`${styles.navBtn} ${activeTab === t.id ? styles.active : ''}`} onClick={() => setActiveTab(t.id)}>
              <span className={styles.icon}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <div className={styles.navGroup}>
          {TABS.slice(5).map(t => (
            <button key={t.id} className={`${styles.navBtn} ${activeTab === t.id ? styles.active : ''}`} onClick={() => setActiveTab(t.id)}>
              <span className={styles.icon}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className={styles.mainContent}>
        <header className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className={styles.pageTitle}>{TABS.find(t => t.id === activeTab)?.label || activeTab}</h1>
            <p className={styles.pageSubtitle}>Welcome back, {user.username}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: '#fff', border: '2px solid #f97316', padding: '0.2rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Active Discount OTP</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f97316', letterSpacing: '2px' }}>{discountOtp}</div>
            </div>
            <button className={styles.btnSecondary} onClick={fetchFinanceData}>🔄 Refresh</button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════
            OVERVIEW TAB — Chart of Accounts + Transfers
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Overview' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Time Range Filter */}
            <div className={styles.filterBar}>
              <div className={styles.filterBtnGroup}>
                {['today', 'week', 'month', 'all'].map(range => (
                  <button key={range} className={`${styles.filterPill} ${timeRange === range ? styles.active : ''}`} onClick={() => setTimeRange(range)}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* P&L Summary Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className={styles.statLabel}>Gross Sales Revenue</div>
                <div className={styles.statValue}>₦{report.grossRevenue?.toLocaleString()}</div>
                <div className={styles.statSub}>{report.ordersCount} orders</div>
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
              <div className={styles.statCard} style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className={styles.statLabel}>Customer Receivables</div>
                <div className={styles.statValue} style={{ color: '#8b5cf6' }}>₦{receivables.toLocaleString()}</div>
                <div className={styles.statSub}>Active wallet balances</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className={styles.statLabel}>Vendor Payables</div>
                <div className={styles.statValue} style={{ color: '#f59e0b' }}>₦{payables.toLocaleString()}</div>
                <div className={styles.statSub}>Outstanding to vendors</div>
              </div>
            </div>

            {/* ── Chart of Accounts ────────────────── */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>📋 Chart of Accounts — Live Balances</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Aggregated from all inflows, outflows & transfers</span>
              </div>
              <div className={styles.panelBody} style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {accounts.map(acct => {
                    const style = ACCOUNT_COLORS[acct.name] || { bg: '#f8fafc', text: '#1e293b', border: '#e2e8f0', icon: '💰' };
                    return (
                      <div key={acct.name} style={{
                        background: style.bg, border: `2px solid ${style.border}`, borderRadius: '12px',
                        padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        transition: 'transform 0.2s', cursor: 'default'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '1.5rem' }}>{style.icon}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: style.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{acct.name}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: acct.balance >= 0 ? style.text : '#dc2626' }}>
                          ₦{Math.abs(acct.balance).toLocaleString()}
                        </div>
                        {acct.balance < 0 && <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>⚠ DEFICIT</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Inter-Account Transfer ───────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>🔁 Move Funds Between Accounts</h2>
                </div>
                <div className={styles.panelBody}>
                  <form onSubmit={handleTransferSubmit} className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>From Account</label>
                      <select className={styles.formControl} value={newTransfer.fromAccount} onChange={e => setNewTransfer({ ...newTransfer, fromAccount: e.target.value })}>
                        {PAYMENT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>To Account</label>
                      <select className={styles.formControl} value={newTransfer.toAccount} onChange={e => setNewTransfer({ ...newTransfer, toAccount: e.target.value })}>
                        {PAYMENT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Amount (₦)</label>
                      <input type="number" className={styles.formControl} required min="1" value={newTransfer.amount} onChange={e => setNewTransfer({ ...newTransfer, amount: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Comment / Reason</label>
                      <input type="text" className={styles.formControl} value={newTransfer.comment} onChange={e => setNewTransfer({ ...newTransfer, comment: e.target.value })} placeholder="e.g. Fund petty cash" />
                    </div>
                    <div className={`${styles.formGroup} ${styles.full}`}>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#1d4ed8', marginBottom: '0.75rem' }}>
                        💡 Moving <strong>₦{Number(newTransfer.amount || 0).toLocaleString()}</strong> from <strong>{newTransfer.fromAccount}</strong> → <strong>{newTransfer.toAccount}</strong>
                      </div>
                      <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: '#7c3aed', borderColor: '#7c3aed' }} disabled={transferLoading}>
                        {transferLoading ? '⏳ Processing...' : '🔁 Execute Transfer'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}><h2 className={styles.panelTitle}>📜 Recent Fund Movements</h2></div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table} style={{ fontSize: '0.82rem' }}>
                    <thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th><th>By</th></tr></thead>
                    <tbody>
                      {transfers.slice(0, 8).map(t => (
                        <tr key={t._id}>
                          <td style={{ color: '#64748b' }}>{new Date(t.date).toLocaleDateString()}</td>
                          <td><span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>{t.fromAccount}</span></td>
                          <td><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>{t.toAccount}</span></td>
                          <td style={{ fontWeight: 700, color: '#7c3aed' }}>₦{t.amount?.toLocaleString()}</td>
                          <td>{t.loggedBy?.username || 'N/A'}</td>
                        </tr>
                      ))}
                      {transfers.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No transfers recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bank Channel Breakdown */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #0ea5e9' }}>
                <div className={styles.statLabel}>FCMB 1 (Period)</div>
                <div className={styles.statValue} style={{ color: '#0ea5e9' }}>₦{(report?.fcmb1Total || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #6366f1' }}>
                <div className={styles.statLabel}>FCMB 2 (Period)</div>
                <div className={styles.statValue} style={{ color: '#6366f1' }}>₦{(report?.fcmb2Total || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #10b981' }}>
                <div className={styles.statLabel}>Nomba (Period)</div>
                <div className={styles.statValue} style={{ color: '#10b981' }}>₦{(report?.nombaTotal || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className={styles.statLabel}>GT BANK (Period)</div>
                <div className={styles.statValue} style={{ color: '#f59e0b' }}>₦{(report?.gtbankTotal || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Bank channel receipts</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #ef4444' }}>
                <div className={styles.statLabel}>PR Orders (Period)</div>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>₦{(report?.prTotal || 0).toLocaleString()}</div>
                <div className={styles.statSub}>Privilege / complimentary</div>
              </div>
            </div>

            {/* Active Cashiers */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Currently Logged In (Active Cashiers)</h2></div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <table className={styles.table}>
                  <thead><tr><th>Staff</th><th>Dept</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString()).map(log => (
                      <tr key={log._id}>
                        <td>{log.user?.username}</td>
                        <td>{log.user?.role}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGreen}`}>ONLINE</span></td>
                        <td>
                          {log.user?.role === 'Sales' && (
                            <button className={styles.btnDanger} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleForceCheckout(log.user?._id)}>Close Shift</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {attendanceLogs.filter(l => !l.checkOut && new Date(l.date).toDateString() === new Date().toDateString()).length === 0 && (
                      <tr><td colSpan="4" className={styles.emptyState}>No staff currently logged in.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            EXPENSES TAB — With paymentAccount + Edit/Delete
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Expenses' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader} style={{ borderLeft: editingExpenseId ? '4px solid #f59e0b' : undefined }}>
                <h2 className={styles.panelTitle}>
                  {editingExpenseId ? '✏️ Edit / Repost Expense' : '🧾 Log Outgoing Cost / Receipt'}
                </h2>
                {editingExpenseId && (
                  <div style={{ fontSize: '0.8rem', color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: '6px' }}>
                    Editing misposted entry — balance will auto-correct
                  </div>
                )}
              </div>
              <div className={styles.panelBody}>
                {/* Account balance hints */}
                {accounts.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {accounts.map(a => {
                      const style = ACCOUNT_COLORS[a.name] || { bg: '#f8fafc', text: '#1e293b', border: '#e2e8f0' };
                      return (
                        <div key={a.name} onClick={() => setNewExpense({ ...newExpense, paymentAccount: a.name })}
                          style={{
                            background: newExpense.paymentAccount === a.name ? style.bg : '#f8fafc',
                            border: `2px solid ${newExpense.paymentAccount === a.name ? style.border : '#e2e8f0'}`,
                            borderRadius: '8px', padding: '4px 10px', cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 700, color: style.text, transition: 'all 0.2s'
                          }}
                        >
                          {a.name}: <strong>₦{a.balance.toLocaleString()}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleExpenseSubmit} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Expense Title / Description</label>
                    <input type="text" className={styles.formControl} required value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="e.g. Generator Fuel, Staff Bonus" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category</label>
                    <select className={styles.formControl} value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                      <option value="Operations">Operations</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Purchases">Inventory Purchases</option>
                      <option value="Salary">Salary / Wages</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>💳 Debit From Account</label>
                    <select className={styles.formControl} value={newExpense.paymentAccount} onChange={e => setNewExpense({ ...newExpense, paymentAccount: e.target.value })}>
                      {PAYMENT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Receipt / Invoice No. (Optional)</label>
                    <input type="text" className={styles.formControl} value={newExpense.receiptNumber} onChange={e => setNewExpense({ ...newExpense, receiptNumber: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Additional Notes</label>
                    <textarea className={styles.formControl} value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} rows="2" />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`} style={{ display: 'flex', gap: '0.75rem' }}>
                    {editingExpenseId && (
                      <button type="button" className={styles.btnSecondary} style={{ flex: '0 0 auto' }} onClick={handleCancelEdit}>✕ Cancel</button>
                    )}
                    <button type="submit" className={styles.btnPrimary} style={{ flex: 1, background: editingExpenseId ? '#f59e0b' : undefined, borderColor: editingExpenseId ? '#f59e0b' : undefined }} disabled={expenseSubmitting}>
                      {expenseSubmitting ? '⏳ Saving...' : editingExpenseId ? '💾 Update Expense' : '💾 Save Expense Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Recent Expense Ledger</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Click Edit to correct a misposted entry</span>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '0.83rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th><th>Details</th><th>Category</th><th>Account</th><th>Amount</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={exp._id} style={{ background: editingExpenseId === exp._id ? '#fefce8' : undefined }}>
                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(exp.date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{exp.title}</div>
                          {exp.receiptNumber && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ref: {exp.receiptNumber}</div>}
                          {exp.loggedBy?.username && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>By: {exp.loggedBy.username}</div>}
                        </td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{exp.category}</span></td>
                        <td>
                          <span style={{
                            background: ACCOUNT_COLORS[exp.paymentAccount]?.bg || '#f8fafc',
                            color: ACCOUNT_COLORS[exp.paymentAccount]?.text || '#1e293b',
                            border: `1px solid ${ACCOUNT_COLORS[exp.paymentAccount]?.border || '#e2e8f0'}`,
                            padding: '2px 7px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {exp.paymentAccount || 'Cash'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap' }}>₦{exp.amount.toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              onClick={() => handleEditExpense(exp)}
                            >✏️ Edit</button>
                            <button
                              style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                              onClick={() => handleDeleteExpense(exp._id)}
                            >🔄 Reverse</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && <tr><td colSpan="6" className={styles.emptyState}>No expenses logged yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            GENERAL LEDGER TAB — Unified Cash Flow + Multi-Sort
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'General Ledger' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Summary KPI row */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #16a34a' }}>
                <div className={styles.statLabel}>Total Inflows</div>
                <div className={styles.statValue} style={{ color: '#16a34a' }}>₦{ledgerInflows.toLocaleString()}</div>
                <div className={styles.statSub}>{ledgerTxns.filter(t => t.flowType === 'Inflow').length} entries</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: '4px solid #ef4444' }}>
                <div className={styles.statLabel}>Total Outflows</div>
                <div className={styles.statValue} style={{ color: '#ef4444' }}>₦{ledgerOutflows.toLocaleString()}</div>
                <div className={styles.statSub}>{ledgerTxns.filter(t => t.flowType === 'Outflow').length} entries</div>
              </div>
              <div className={styles.statCard} style={{ borderLeft: `4px solid ${ledgerNet >= 0 ? '#3b82f6' : '#dc2626'}` }}>
                <div className={styles.statLabel}>Net Cash Flow</div>
                <div className={styles.statValue} style={{ color: ledgerNet >= 0 ? '#2563eb' : '#dc2626' }}>₦{Math.abs(ledgerNet).toLocaleString()}</div>
                <div className={styles.statSub}>{ledgerNet >= 0 ? '▲ Positive flow' : '▼ Negative flow'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Entries</div>
                <div className={styles.statValue}>{ledgerTxns.length}</div>
                <div className={styles.statSub}>Across all accounts</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.panel}>
              <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 className={styles.panelTitle}>📒 General Transactions Ledger</h2>
                <button className={styles.btnPrimary} onClick={exportGeneralLedger} style={{ padding: '0.5rem 1.2rem', background: '#10b981', borderColor: '#10b981' }}>
                  📥 Export CSV
                </button>
              </div>
              <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>From Date</label>
                  <input type="date" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFiltersG.startDate} onChange={e => setLedgerFiltersG({ ...ledgerFiltersG, startDate: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>To Date</label>
                  <input type="date" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFiltersG.endDate} onChange={e => setLedgerFiltersG({ ...ledgerFiltersG, endDate: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Type</label>
                  <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFiltersG.type} onChange={e => setLedgerFiltersG({ ...ledgerFiltersG, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="Sale">Sale</option>
                    <option value="Deposit">Customer Deposit</option>
                    <option value="Expense">Expense</option>
                    <option value="Vendor Payment">Vendor Payment</option>
                    <option value="Transfer">Internal Transfer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Account</label>
                  <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFiltersG.account} onChange={e => setLedgerFiltersG({ ...ledgerFiltersG, account: e.target.value })}>
                    <option value="">All Accounts</option>
                    {PAYMENT_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Cashier</label>
                  <input type="text" className={styles.formControl} style={{ width: '130px', marginBottom: 0, padding: '0.4rem' }} placeholder="Search cashier..." value={ledgerFiltersG.cashier} onChange={e => setLedgerFiltersG({ ...ledgerFiltersG, cashier: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <button className={styles.btnPrimary} style={{ padding: '0.4rem 1rem' }} onClick={fetchGeneralLedger} disabled={ledgerLoading}>
                    {ledgerLoading ? '⏳' : '🔍 Filter'}
                  </button>
                  <button className={styles.btnSecondary} style={{ padding: '0.4rem 0.8rem' }} onClick={() => { setLedgerFiltersG({ startDate: '', endDate: '', type: '', account: '', category: '', cashier: '' }); }}>
                    ✕ Clear
                  </button>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th onClick={() => toggleLedgerSort('date')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Date {getLedgerSortIcon('date')}</th>
                      <th onClick={() => toggleLedgerSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>Type {getLedgerSortIcon('type')}</th>
                      <th>Flow</th>
                      <th onClick={() => toggleLedgerSort('description')} style={{ cursor: 'pointer', userSelect: 'none' }}>Description {getLedgerSortIcon('description')}</th>
                      <th onClick={() => toggleLedgerSort('category')} style={{ cursor: 'pointer', userSelect: 'none' }}>Category {getLedgerSortIcon('category')}</th>
                      <th onClick={() => toggleLedgerSort('account')} style={{ cursor: 'pointer', userSelect: 'none' }}>Account {getLedgerSortIcon('account')}</th>
                      <th onClick={() => toggleLedgerSort('amount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>Amount {getLedgerSortIcon('amount')}</th>
                      <th onClick={() => toggleLedgerSort('cashier')} style={{ cursor: 'pointer', userSelect: 'none' }}>Cashier {getLedgerSortIcon('cashier')}</th>
                      <th>Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedLedger().map((txn, i) => (
                      <tr key={`${txn.id}-${i}`} style={{ background: txn.flowType === 'Inflow' ? '#f0fdf4' : txn.flowType === 'Outflow' ? '#fff5f5' : undefined }}>
                        <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(txn.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>
                          <span style={{
                            background: txn.type === 'Sale' ? '#dbeafe' : txn.type === 'Expense' ? '#fee2e2' : txn.type === 'Deposit' ? '#dcfce7' : txn.type === 'Transfer' ? '#ede9fe' : '#f1f5f9',
                            color: txn.type === 'Sale' ? '#1e40af' : txn.type === 'Expense' ? '#991b1b' : txn.type === 'Deposit' ? '#166534' : txn.type === 'Transfer' ? '#5b21b6' : '#475569',
                            padding: '2px 7px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700
                          }}>{txn.type}</span>
                        </td>
                        <td>
                          <span style={{
                            background: txn.flowType === 'Inflow' ? '#dcfce7' : '#fee2e2',
                            color: txn.flowType === 'Inflow' ? '#166534' : '#991b1b',
                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800
                          }}>
                            {txn.flowType === 'Inflow' ? '▲ IN' : '▼ OUT'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={txn.description}>{txn.description}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{txn.category}</span></td>
                        <td>
                          <span style={{
                            background: ACCOUNT_COLORS[txn.account]?.bg || '#f8fafc',
                            color: ACCOUNT_COLORS[txn.account]?.text || '#1e293b',
                            border: `1px solid ${ACCOUNT_COLORS[txn.account]?.border || '#e2e8f0'}`,
                            padding: '2px 7px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700
                          }}>{txn.account}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: txn.flowType === 'Inflow' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                          {txn.flowType === 'Inflow' ? '+' : '-'}₦{txn.amount?.toLocaleString()}
                        </td>
                        <td style={{ color: '#475569' }}>{txn.cashier}</td>
                        <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{txn.ref || '—'}</td>
                      </tr>
                    ))}
                    {ledgerTxns.length === 0 && !ledgerLoading && (
                      <tr><td colSpan="9" className={styles.emptyState}>No transactions found. Apply filters and click Filter.</td></tr>
                    )}
                    {ledgerLoading && (
                      <tr><td colSpan="9" className={styles.emptyState}>⏳ Loading transactions...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            RECEIVABLES TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Receivables' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Create Customer Account</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateCustomer} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Customer Name</label>
                    <input type="text" className={styles.formControl} required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone Number</label>
                    <input type="text" className={styles.formControl} required value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Initial Deposit (₦)</label>
                    <input type="number" className={styles.formControl} value={newCustomer.initialDeposit} onChange={e => setNewCustomer({ ...newCustomer, initialDeposit: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%' }}>Create Account</button>
                  </div>
                </form>
              </div>
              <div className={styles.panelHeader} style={{ marginTop: '2rem' }}><h2 className={styles.panelTitle}>Log Advance Payment (Deposit)</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleDeposit} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Select Customer</label>
                    <select className={styles.formControl} required value={depositData.customerId} onChange={e => setDepositData({ ...depositData, customerId: e.target.value })}>
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone}) - Bal: ₦{c.walletBalance}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={depositData.amount} onChange={e => setDepositData({ ...depositData, amount: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ref / Receipt</label>
                    <input type="text" className={styles.formControl} value={depositData.reference} onChange={e => setDepositData({ ...depositData, reference: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Notes</label>
                    <input type="text" className={styles.formControl} value={depositData.notes} onChange={e => setDepositData({ ...depositData, notes: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: '#16a34a', borderColor: '#16a34a' }}>Log Deposit</button>
                  </div>
                </form>
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Receivable Accounts Ledger</h2></div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Name</th><th>Phone</th><th>Wallet Balance</th></tr></thead>
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

        {/* ═══════════════════════════════════════════════════════
            PAYABLES TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Payables' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Create Vendor Account</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateVendor} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Contact Name</label>
                    <input type="text" className={styles.formControl} required value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Company</label>
                    <input type="text" className={styles.formControl} value={newVendor.company} onChange={e => setNewVendor({ ...newVendor, company: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Phone Number</label>
                    <input type="text" className={styles.formControl} value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Initial Balance Owed (₦)</label>
                    <input type="number" className={styles.formControl} value={newVendor.initialBalance} onChange={e => setNewVendor({ ...newVendor, initialBalance: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary} style={{ width: '100%', background: '#6366f1', borderColor: '#6366f1' }}>Create Vendor</button>
                  </div>
                </form>
              </div>
              <div className={styles.panelHeader} style={{ marginTop: '2rem' }}><h2 className={styles.panelTitle}>Log Vendor Transaction</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleVendorTx} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Select Vendor</label>
                    <select className={styles.formControl} required value={vendorTxData.vendorId} onChange={e => setVendorTxData({ ...vendorTxData, vendorId: e.target.value })}>
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.company}) - Owed: ₦{v.balanceOwed}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Transaction Type</label>
                    <select className={styles.formControl} value={vendorTxData.type} onChange={e => setVendorTxData({ ...vendorTxData, type: e.target.value })}>
                      <option value="Payment">Payment (Reduce Owed)</option>
                      <option value="Invoice">Invoice (Increase Owed)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₦)</label>
                    <input type="number" className={styles.formControl} required value={vendorTxData.amount} onChange={e => setVendorTxData({ ...vendorTxData, amount: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ref / Receipt</label>
                    <input type="text" className={styles.formControl} value={vendorTxData.reference} onChange={e => setVendorTxData({ ...vendorTxData, reference: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <input type="text" className={styles.formControl} value={vendorTxData.notes} onChange={e => setVendorTxData({ ...vendorTxData, notes: e.target.value })} />
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
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Payables Ledger</h2></div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Vendor</th><th>Company</th><th>Balance Owed</th></tr></thead>
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

        {/* ═══════════════════════════════════════════════════════
            SALES REPORT TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Sales Report' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className={styles.panelTitle}>Transactions Report</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.startDate} onChange={e => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
                <span style={{ color: '#64748b' }}>to</span>
                <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.endDate} onChange={e => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
                <input type="text" placeholder="Filter Cashier" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.cashier} onChange={e => setReportFilters({ ...reportFilters, cashier: e.target.value })} />
                <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={reportFilters.paymentMethod} onChange={e => setReportFilters({ ...reportFilters, paymentMethod: e.target.value })}>
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Transfer</option>
                  <option value="FCMB 1">FCMB 1</option>
                  <option value="FCMB 2">FCMB 2</option>
                  <option value="Nomba">Nomba</option>
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
                    <th onClick={() => toggleSort('paymentMethod')} style={{ cursor: 'pointer', userSelect: 'none' }}>Payment {getSortIcon('paymentMethod')}</th>
                    <th onClick={() => toggleSort('salesPersonName')} style={{ cursor: 'pointer', userSelect: 'none' }}>Cashier {getSortIcon('salesPersonName')}</th>
                    <th>Items</th>
                    <th onClick={() => toggleSort('totalAmount')} style={{ cursor: 'pointer', userSelect: 'none' }}>Total {getSortIcon('totalAmount')}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredSorted().map(order => (
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
                  {getFilteredSorted().length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No transactions found.</td></tr>}
                </tbody>
              </table>
            </div>
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
                    <div><span style={{ color: '#64748b' }}>Payment:</span> <strong>{selectedOrder.paymentMethod}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Cashier:</span> <strong>{selectedOrder.salesPersonName || selectedOrder.salesPerson?.username || 'N/A'}</strong></div>
                  </div>
                  <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '1rem' }}>Purchased Items</h4>
                  <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.product?.name || 'Unknown'}</td>
                          <td>{item.quantity}</td>
                          <td>₦{item.priceAtTime?.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₦{(item.priceAtTime * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Subtotal: ₦{selectedOrder.subTotalAmount?.toLocaleString() || selectedOrder.totalAmount?.toLocaleString()}</div>
                    {selectedOrder.discountAmount > 0 && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>Discount: -₦{selectedOrder.discountAmount?.toLocaleString()}</div>}
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>Grand Total: ₦{selectedOrder.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MARGIN CONFIGURATION TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Margin Configuration' && user.role === 'SuperAdmin' && (
          <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Bulk Supply Margin Settings</h2></div>
            <div className={styles.panelBody} style={{ padding: '1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.9rem' }}>
              Set the desired Profit Margin % for bulk supplies. The system will automatically calculate the retail Unit Cost.
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Item Name</th><th>Base Unit</th><th>Landing Cost/Unit</th><th>Profit Margin (%)</th><th>Calculated Retail Price</th></tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                      <td>{item.unit}</td>
                      <td>₦{item.averageCostPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>
                        <input type="number" defaultValue={item.marginPercentage || 0}
                          style={{ width: '80px', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          onBlur={(e) => { if (Number(e.target.value) !== item.marginPercentage) handleMarginUpdate(item._id, e.target.value); }}
                        /> %
                      </td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>₦{(item.retailPricePerUnit || item.averageCostPerUnit).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {inventory.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No items in inventory.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MENU MANAGEMENT TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Menu Management' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Create Menu Item</h2></div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateProduct} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Item Name</label>
                    <input type="text" className={styles.formControl} required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Price (₦)</label>
                    <input type="number" className={styles.formControl} required value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Category</label>
                    <select className={styles.formControl} value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                      {['FOOD','PROTEIN','SOUP','SWALLOW','SIDE','DRINK','PACK','ICE CREAM','PASTRY'].map(c => <option key={c} value={c}>{c}</option>)}
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
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Active Menu Items</h2></div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead><tr><th>Image</th><th>Name &amp; Category</th><th>Price</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product._id}>
                        <td>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 40, height: 40, background: '#e2e8f0', borderRadius: 4 }} />}</td>
                        <td><div style={{ fontWeight: 600 }}>{product.name}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.category}</div></td>
                        <td style={{ fontWeight: 800 }}>₦{product.price.toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.btnSecondary} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setEditingProductId(product._id); setEditProductData({ name: product.name, price: product.price, category: product.category || 'FOOD' }); setEditProductImage(null); }}>Edit</button>
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
            {editingProductId && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', width: '90%', maxWidth: '500px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Edit Menu Item</h3>
                  <form onSubmit={(e) => handleUpdateProduct(editingProductId, e)} className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.full}`}><label className={styles.formLabel}>Item Name</label><input type="text" className={styles.formControl} required value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} /></div>
                    <div className={`${styles.formGroup} ${styles.full}`}><label className={styles.formLabel}>Price (₦)</label><input type="number" className={styles.formControl} required value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: e.target.value })} /></div>
                    <div className={`${styles.formGroup} ${styles.full}`}><label className={styles.formLabel}>Category</label>
                      <select className={styles.formControl} value={editProductData.category} onChange={e => setEditProductData({ ...editProductData, category: e.target.value })}>
                        {['FOOD','PROTEIN','SOUP','SWALLOW','SIDE','DRINK','PACK','ICE CREAM','PASTRY'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className={`${styles.formGroup} ${styles.full}`}><label className={styles.formLabel}>New Image (Optional)</label><input type="file" accept="image/*" className={styles.formControl} onChange={e => setEditProductImage(e.target.files[0])} /></div>
                    <div className={`${styles.formGroup} ${styles.full}`} style={{ display: 'flex', gap: '1rem' }}>
                      <button type="button" className={styles.btnSecondary} style={{ flex: 1 }} onClick={() => setEditingProductId(null)}>Cancel</button>
                      <button type="submit" className={styles.btnPrimary} style={{ flex: 1 }}>Save Changes</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            GRAPHICAL REPORTS TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Graphical Reports' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><h2 className={styles.panelTitle}>7-Day Revenue vs Expenses Trend</h2></div>
              <div className={styles.panelBody} style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#059669" strokeWidth={3} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={styles.twoCol}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Sales by Payment Method (Pie)</h2></div>
                <div className={styles.panelBody} style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartsData.paymentMethodChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {chartsData.paymentMethodChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={styles.panel}>
                <div className={styles.panelHeader}><h2 className={styles.panelTitle}>Sales by Payment Method (Bar)</h2></div>
                <div className={styles.panelBody} style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.paymentMethodChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
                      <Bar dataKey="value" name="Total Amount" fill="#3b82f6">
                        {chartsData.paymentMethodChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            INVENTORY LEDGER TAB
        ═══════════════════════════════════════════════════════ */}
        {activeTab === 'Inventory Ledger' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className={styles.panelTitle}>Advanced Inventory Ledger</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.startDate} onChange={e => setLedgerFilters({ ...ledgerFilters, startDate: e.target.value })} />
                  <span style={{ color: '#64748b' }}>to</span>
                  <input type="datetime-local" className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.endDate} onChange={e => setLedgerFilters({ ...ledgerFilters, endDate: e.target.value })} />
                  <select className={styles.formControl} style={{ width: 'auto', marginBottom: 0, padding: '0.4rem' }} value={ledgerFilters.itemId} onChange={e => setLedgerFilters({ ...ledgerFilters, itemId: e.target.value })}>
                    <option value="">All Items</option>
                    {inventory.map(item => <option key={item._id} value={item._id}>{item.itemName} ({item.unit})</option>)}
                  </select>
                  <button className={styles.btnSecondary} onClick={fetchFinanceData} style={{ padding: '0.5rem 1rem' }}>Generate Ledger</button>
                </div>
              </div>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><div className={styles.statLabel}>Opening Value</div><div className={styles.statValue}>₦{(ledgerData.openingValue || 0).toLocaleString()}</div><div className={styles.statSub}>At start date</div></div>
              <div className={styles.statCard} style={{ background: '#ecfdf5' }}><div className={styles.statLabel}>Closing Value</div><div className={styles.statValue} style={{ color: '#059669' }}>₦{(ledgerData.closingValue || 0).toLocaleString()}</div><div className={styles.statSub}>At end date</div></div>
              <div className={styles.statCard} style={{ background: '#eff6ff' }}><div className={styles.statLabel}>Total Inflows</div><div className={styles.statValue} style={{ color: '#2563eb' }}>₦{(ledgerData.totalInflows || 0).toLocaleString()}</div></div>
              <div className={styles.statCard} style={{ background: '#fef2f2' }}><div className={styles.statLabel}>Total Outflows</div><div className={styles.statValue} style={{ color: '#dc2626' }}>₦{(ledgerData.totalOutflows || 0).toLocaleString()}</div></div>
            </div>
            <div className={styles.panel}>
              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>Date / Time</th><th>Type</th><th>Item</th><th>Qty Change</th><th>Value Impact</th><th>Actor</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {ledgerData.activities.map((act, i) => (
                      <tr key={act.id || i}>
                        <td>{new Date(act.date).toLocaleString()}</td>
                        <td><span className={styles.badge} style={{ background: act.type === 'Supply' ? '#dbeafe' : act.type === 'Kitchen Request' ? '#fee2e2' : '#dcfce7', color: act.type === 'Supply' ? '#1e40af' : act.type === 'Kitchen Request' ? '#991b1b' : '#166534' }}>{act.type}</span></td>
                        <td style={{ fontWeight: 600 }}>{act.itemName}</td>
                        <td style={{ fontWeight: 700, color: act.qtyChange > 0 ? '#16a34a' : '#ef4444' }}>{act.qtyChange > 0 ? '+' : ''}{act.qtyChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td style={{ color: act.valueChange > 0 ? '#16a34a' : '#ef4444' }}>₦{act.valueChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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
