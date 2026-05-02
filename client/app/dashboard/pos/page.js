"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import styles from './page.module.css';

export default function POSPage() {
  const { user } = useAppContext();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') || 'Main';
  
  const [products, setProducts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [prComment, setPrComment] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('Today');
  const [interventionActive, setInterventionActive] = useState(false);
  
  const receiptRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeView === 'History') {
      fetchFilteredOrders('Today');
    }
  }, [activeView]);

  const fetchData = async () => {
    try {
      const [prodRes, settRes, orderRes, transRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings'),
        api.get('/orders'),
        api.get('/transfers/pending')
      ]);
      setProducts(prodRes.data);
      setSettings(settRes.data);
      setOrders(orderRes.data);
      setPendingTransfers(transRes.data);
    } catch (err) {
      console.error('Failed to fetch POS data', err);
    }
  };

  const handleAcceptTransfer = async (id) => {
    try {
      await api.put(`/transfers/${id}/accept`);
      fetchData();
      alert('Inventory accepted and confirmed!');
    } catch (err) {
      console.error(err);
      alert('Failed to accept inventory');
    }
  };

  const fetchFilteredOrders = async (filter) => {
    setHistoryFilter(filter);
    let startDate = new Date();
    startDate.setHours(0,0,0,0);
    
    if (filter === 'Week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (filter === 'Month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    try {
      const res = await api.get(`/orders?startDate=${startDate.toISOString()}`);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const addToPosCart = (product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item._id === id) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const totalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (posCart.length === 0) return;
    if (paymentMethod === 'PR' && !prComment.trim()) {
      alert("Please enter a PR comment (e.g., 'MD's Guest').");
      return;
    }

    const orderData = {
      orderType: activeView === 'Main' ? 'WalkIn' : activeView,
      items: posCart.map(item => ({ product: item._id, quantity: item.quantity, priceAtTime: item.price })),
      totalAmount,
      status: 'Completed',
      paymentMethod,
      prComment: paymentMethod === 'PR' ? prComment : '',
      salesPersonName: user?.username || 'Unknown Staff'
    };

    try {
      const res = await api.post('/orders', orderData);
      const savedOrder = res.data;
      
      setLastOrder({
        ...savedOrder,
        items: posCart,
        date: new Date(savedOrder.createdAt).toLocaleString()
      });
      setShowReceipt(true);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save order');
    }
  };

  const handleIntervention = () => {
    if (interventionActive) {
      setInterventionActive(false);
      return;
    }
    const pwd = prompt("Enter Intervention Password:");
    if (pwd === settings?.interventionPassword) {
      setInterventionActive(true);
    } else if (pwd !== null) {
      alert("Incorrect password!");
    }
  };

  const removeFromCart = (id) => {
    setPosCart(prev => prev.filter(item => item._id !== id));
  };

  const printReceipt = () => {
    window.print();
    setPosCart([]);
    setPrComment('');
    setShowReceipt(false);
  };

  const handleCloseShift = async () => {
    if (!confirm('Are you sure you want to close your shift and end attendance?')) return;
    try {
      await api.post('/attendance/check-out');
      alert('Shift closed and attendance ended successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing shift');
    }
  };

  return (
    <div className={styles.posContainer}>
        {activeView === 'Main' && (
          <>
            {/* Menu Section */}
            <div className={styles.menuSection}>
              {pendingTransfers.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#854d0e', marginBottom: '0.5rem' }}>📦 Incoming from Kitchen</h3>
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {pendingTransfers.map(t => (
                      <div key={t._id} style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', minWidth: '220px', border: '1px solid #fef08a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.product?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>Qty: {t.quantity} | By: {t.handledBy?.username}</div>
                        </div>
                        <button 
                          onClick={() => handleAcceptTransfer(t._id)}
                          style={{ background: '#57a74a', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.header}>
                <h1 className={styles.title}>Walk-in Orders</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className={`${styles.shiftBtn} ${interventionActive ? styles.interventionActiveBtn : ''}`} 
                    onClick={handleIntervention}
                    style={{ background: interventionActive ? '#ef4444' : '#6366f1', color: 'white' }}
                  >
                    {interventionActive ? '🔓 End Intervention' : '🔒 Intervention'}
                  </button>
                  <button className={styles.shiftBtn} onClick={handleCloseShift}>Close Shift</button>
                </div>
              </div>
              
              <div className={styles.menuGrid}>
                {products.map(product => (
                  <div key={product._id} className={styles.menuCard} onClick={() => addToPosCart(product)}>
                    {product.imageUrl && (
                      <div 
                        style={{ 
                          height: '100px', 
                          width: '100%', 
                          backgroundImage: `url(${product.imageUrl})`, 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center',
                          borderRadius: '4px',
                          marginBottom: '0.5rem'
                        }} 
                      />
                    )}
                    {!product.imageUrl && (
                      <div 
                        style={{ 
                          height: '100px', 
                          width: '100%', 
                          backgroundColor: '#f3f4f6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderRadius: '4px',
                          marginBottom: '0.5rem',
                          color: '#9ca3af',
                          fontSize: '0.8rem'
                        }}
                      >
                        No Image
                      </div>
                    )}
                    <div className={styles.menuItemName}>{product.name}</div>
                    <div className={styles.menuItemPrice}>₦{product.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Section */}
            <div className={styles.cartSection}>
              <h2 className={styles.cartTitle}>Current Order</h2>
              
              <div className={styles.cartItems}>
                {posCart.length === 0 && <p style={{color: '#999', textAlign:'center'}}>Cart is empty</p>}
                {posCart.map(item => (
                  <div key={item._id} className={styles.cartItem}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{item.name}</div>
                      <div style={{fontSize: '0.9rem', color: '#666'}}>₦{item.price}</div>
                    </div>
                    <div className={styles.qtyControl}>
                      {interventionActive ? (
                        <>
                          <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, -1)}>-</button>
                          <span>{item.quantity}</span>
                          <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, 1)}>+</button>
                          <button 
                            className={styles.removeBtn} 
                            onClick={() => removeFromCart(item._id)}
                            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span style={{ fontWeight: 'bold' }}>x {item.quantity}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.cartSummary}>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span>₦{totalAmount}</span>
                </div>

                <div className={styles.paymentMethods}>
                  {['Cash', 'Card', 'Transfer', (interventionActive ? 'PR' : null)].filter(Boolean).map(method => (
                    <button 
                      key={method}
                      className={`${styles.payBtn} ${paymentMethod === method ? styles.selected : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'PR' && (
                  <div className={styles.prSection}>
                    <input 
                      type="text" 
                      className={styles.prInput} 
                      placeholder="PR Comment (e.g. MD)"
                      value={prComment}
                      onChange={e => setPrComment(e.target.value)}
                    />
                    <small style={{color: '#eab308'}}>Requires Manager Approval later</small>
                  </div>
                )}

                <button 
                  className={`btn-primary ${styles.checkoutBtn}`} 
                  onClick={handleCheckout}
                  disabled={posCart.length === 0}
                >
                  Confirm & Print Receipt
                </button>
              </div>
            </div>
          </>
        )}

        {(activeView === 'Website' || activeView === 'Glovo' || activeView === 'Chowdeck') && (
          <div className={styles.fullView}>
            <h1 className={styles.title}>{activeView} Orders</h1>
            <div className={styles.orderGrid}>
              {orders.filter(o => o.orderType === (activeView === 'Website' ? 'Online' : activeView)).map(order => (
                <div key={order._id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderId}>Order #{order._id.slice(-6)}</span>
                    <span className={`${styles.orderStatus} ${styles[order.status]}`}>{order.status}</span>
                  </div>
                  <div className={styles.orderInfo}>
                    <p><strong>Customer:</strong> {order.customerName || 'Walk-in'}</p>
                    <p><strong>Phone:</strong> {order.customerPhone || 'N/A'}</p>
                    <p><strong>Total:</strong> ₦{order.totalAmount}</p>
                  </div>
                  <div className={styles.orderItems}>
                    {order.items.map((item, i) => (
                      <div key={i}>{item.product?.name} x {item.quantity}</div>
                    ))}
                  </div>
                  {order.status === 'Pending' && (
                    <div className={styles.orderActions}>
                      <button className={styles.acceptBtn} onClick={() => updateOrderStatus(order._id, 'Accepted')}>Accept</button>
                      <button className={styles.declineBtn} onClick={() => updateOrderStatus(order._id, 'Declined')}>Decline</button>
                    </div>
                  )}
                  {order.status === 'Accepted' && (
                    <button className={styles.completeBtn} onClick={() => updateOrderStatus(order._id, 'Completed')}>Mark as Completed</button>
                  )}
                </div>
              ))}
              {orders.filter(o => o.orderType === (activeView === 'Website' ? 'Online' : activeView)).length === 0 && (
                <p>No {activeView} orders found.</p>
              )}
            </div>
          </div>
        )}

        {activeView === 'History' && (
          <div className={styles.fullView}>
            <div className={styles.header}>
              <h1 className={styles.title}>Sales History</h1>
              <div className={styles.filters}>
                {['Today', 'Week', 'Month'].map(f => (
                  <button 
                    key={f} 
                    className={`${styles.filterBtn} ${historyFilter === f ? styles.activeFilter : ''}`}
                    onClick={() => fetchFilteredOrders(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.historyTableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Staff</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id}>
                      <td>{new Date(order.createdAt).toLocaleString()}</td>
                      <td>#{order._id.slice(-6)}</td>
                      <td>{order.orderType}</td>
                      <td>{order.items.length} items</td>
                      <td>{order.salesPerson?.username || 'N/A'}</td>
                      <td>₦{order.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Receipt Print Modal */}
      {showReceipt && lastOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.printArea}`} ref={receiptRef}>
            <div className={styles.receipt}>
              <h2>{settings?.storeName || "Cyril's Foods"}</h2>
              <p>{settings?.address || "123 Food Avenue, Lagos"}</p>
              <div className={styles.receiptDivider}></div>
              <p>Receipt ID: {lastOrder._id}</p>
              <p>Date: {lastOrder.date}</p>
              <p>Sales Rep: {lastOrder.salesPersonName}</p>
              <p>Payment: {lastOrder.paymentMethod} {lastOrder.paymentMethod === 'PR' ? `(${lastOrder.prComment})` : ''}</p>
              <div className={styles.receiptDivider}></div>
              
              <table className={styles.receiptTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className={styles.textRight}>Qty</th>
                    <th className={styles.textRight}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {lastOrder.items.map(item => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td className={styles.textRight}>{item.quantity}</td>
                      <td className={styles.textRight}>{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={styles.receiptDivider}></div>
              <h3 style={{textAlign: 'right', margin: '0.5rem 0'}}>TOTAL: ₦{lastOrder.totalAmount}</h3>
              <div className={styles.receiptDivider}></div>
              <p>Thank you for dining with us!</p>
              <p>Please come again.</p>
              
              <div className="no-print" style={{marginTop: '2rem', display: 'flex', gap: '1rem'}}>
                <button className="btn-primary" style={{flex: 1}} onClick={printReceipt}>Print</button>
                <button className="btn-secondary" style={{flex: 1}} onClick={() => setShowReceipt(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
