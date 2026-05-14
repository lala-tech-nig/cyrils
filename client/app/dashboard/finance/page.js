"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css'; // Reusing manager styles for consistency

export default function FinanceDashboard() {
  const { user } = useAppContext();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  // Financial Data
  const [report, setReport] = useState({ grossRevenue: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: {} });
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [timeRange, setTimeRange] = useState('month');

  // Expense Form
  const [newExpense, setNewExpense] = useState({
    title: '', amount: '', category: 'Operations', receiptNumber: '', notes: ''
  });

  useEffect(() => {
    fetchFinanceData();
  }, [activeTab, timeRange]);

  const fetchFinanceData = async () => {
    try {
      if (activeTab === 'Overview') {
        const res = await api.get(`/finance/report?timeRange=${timeRange}`);
        setReport(res.data);
      } else if (activeTab === 'Expenses') {
        const res = await api.get('/finance/expenses');
        setExpenses(res.data);
      } else if (activeTab === 'Margin Configuration') {
        const res = await api.get('/inventory');
        setInventory(res.data);
      }
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load finance data');
      setLoading(false);
    }
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

  if (!user || !['Finance', 'Manager', 'SuperAdmin'].includes(user.role)) {
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
          <button className={`${styles.navBtn} ${activeTab === 'Expenses' ? styles.active : ''}`} onClick={() => setActiveTab('Expenses')}>
            <span className={styles.icon}>🧾</span> Outgoing Costs
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
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
            <p className={styles.pageSubtitle}>Welcome back, {user.username}</p>
          </div>
          <button className={styles.btnSecondary} onClick={fetchFinanceData}>
            🔄 Refresh
          </button>
        </header>

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

      </main>
    </div>
  );
}
