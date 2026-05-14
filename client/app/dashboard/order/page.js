"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import styles from '../manager/manager.module.css';

export default function OrderDashboard() {
  const { user, socket } = useAppContext();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending Online Orders');

  useEffect(() => {
    fetchOrders();

    if (socket) {
      socket.on('new_online_order', (newOrder) => {
        // Play an alert sound or toast for new order
        toast.info('New Online Order Received!');
        setOrders(prev => [newOrder, ...prev]);
      });

      socket.on('order_updated', (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      });
    }

    return () => {
      if (socket) {
        socket.off('new_online_order');
        socket.off('order_updated');
      }
    };
  }, [socket]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch online orders
      const res = await api.get('/orders?type=Online');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      const res = await api.put(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id === id ? res.data : o));
      toast.success(`Order marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  if (!user || !['Order', 'Manager', 'SuperAdmin'].includes(user.role)) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Accepted');
  const pastOrders = orders.filter(o => o.status === 'Completed' || o.status === 'Declined');

  const displayedOrders = activeTab === 'Pending Online Orders' ? pendingOrders : pastOrders;

  if (loading && !orders.length) return <div style={{ padding: '2rem' }}>Loading Orders...</div>;

  return (
    <div className={styles.managerWrapper}>
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button 
            className={`${styles.navBtn} ${activeTab === 'Pending Online Orders' ? styles.active : ''}`} 
            onClick={() => setActiveTab('Pending Online Orders')}
          >
            <span className={styles.icon}>🔔</span> Pending Orders 
            {pendingOrders.length > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '8px' }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === 'Order History' ? styles.active : ''}`} 
            onClick={() => setActiveTab('Order History')}
          >
            <span className={styles.icon}>📋</span> Order History
          </button>
        </div>
      </nav>

      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
            <p className={styles.pageSubtitle}>Manage incoming website orders</p>
          </div>
          <button className={styles.btnSecondary} onClick={fetchOrders}>🔄 Refresh</button>
        </header>

        <div className={styles.panel} style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer Info</th>
                  <th>Order Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(order => (
                  <tr key={order._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(order.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{order.customerName || 'N/A'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customerPhone || 'N/A'}</div>
                    </td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                        {order.items.map((item, idx) => (
                          <li key={idx}>
                            <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.product?.name || 'Unknown Item'}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ fontWeight: 800, color: '#16a34a' }}>
                      ₦{order.totalAmount.toLocaleString()}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${
                        order.status === 'Completed' ? styles.badgeGreen : 
                        order.status === 'Declined' ? styles.badgeRed : 
                        order.status === 'Accepted' ? styles.badgeOrange : 
                        styles.badgeGray
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className={styles.btnSuccess} onClick={() => updateOrderStatus(order._id, 'Accepted')}>Accept</button>
                          <button className={styles.btnDanger} onClick={() => updateOrderStatus(order._id, 'Declined')}>Decline</button>
                        </div>
                      )}
                      {order.status === 'Accepted' && (
                        <button className={styles.btnPrimary} onClick={() => updateOrderStatus(order._id, 'Completed')}>Mark Completed</button>
                      )}
                      {(order.status === 'Completed' || order.status === 'Declined') && (
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No action needed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className={styles.emptyState}>No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
