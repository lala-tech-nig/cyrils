"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import styles from './page.module.css';
import { useToast } from '../../../context/ToastContext';
import { flushSync } from 'react-dom';

export default function POSPage() {
  const { user } = useAppContext();
  const toast = useToast();
  
  const [products, setProducts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const categories = ['All', 'FOOD', 'PROTEIN', 'SOUP', 'SWALLOW', 'SIDE', 'DRINK', 'PACK', 'ICE CREAM', 'PASTRY'];
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [prComment, setPrComment] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [settings, setSettings] = useState(null);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  
  const receiptRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Broadcast cart changes to VFD screen
  useEffect(() => {
    localStorage.setItem('vfd_cart', JSON.stringify(posCart));
    localStorage.setItem('vfd_total', totalAmount.toString());
  }, [posCart]);

  const fetchData = async () => {
    try {
      const [prodRes, settRes, transRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings'),
        api.get('/transfers/pending')
      ]);
      const sortedProducts = prodRes.data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setProducts(sortedProducts);
      setSettings(settRes.data);
      setPendingTransfers(transRes.data);
    } catch (err) {
      console.error('Failed to fetch POS data', err);
    }
  };

  const handleAcceptTransfer = async (id) => {
    try {
      await api.put(`/transfers/${id}/accept`);
      fetchData();
      toast.success('Inventory accepted and confirmed!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept inventory');
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

  const removeFromCart = (id) => {
    setPosCart(prev => prev.filter(item => item._id !== id));
  };

  const totalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (posCart.length === 0) return;
    if (paymentMethod === 'PR' && !prComment.trim()) {
      toast.warning("Please enter a PR comment (e.g., 'MD's Guest').");
      return;
    }

    setIsCheckingOut(true);

    const orderData = {
      orderType: 'WalkIn',
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
      
      const orderToPrint = {
        ...savedOrder,
        items: posCart,
        date: new Date(savedOrder.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      };
      
      flushSync(() => {
        setLastOrder(orderToPrint);
        setShowReceipt(true);
      });
      
      window.print();
      
      setPosCart([]);
      setPrComment('');
      setShowReceipt(false);
      
      fetchData();
      toast.success('Order saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const printReceipt = () => {
    window.print();
    setPosCart([]);
    setPrComment('');
    setShowReceipt(false);
  };

  const openVFDScreen = () => {
    const leftPos = window.screen.width;
    window.open('/vfd', '_blank', `width=1024,height=768,left=${leftPos},top=0`);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || (p.category || '').toUpperCase() === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={styles.posContainer}>
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
        
        <div className={styles.header} style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 className={styles.title}>SALES</h1>
            <input 
              type="text" 
              placeholder="🔍 Search menu..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', minWidth: '220px', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#f97316'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className={styles.filters} style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`${styles.filterBtn} ${selectedCategory === cat ? styles.activeFilter : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button 
              className={styles.shiftBtn} 
              onClick={openVFDScreen}
              style={{ background: '#8b5cf6', color: 'white', whiteSpace: 'nowrap' }}
            >
              🖥️ Open VFD Screen
            </button>
          </div>
        </div>
        
        <div className={styles.menuGrid}>
          {filteredProducts.map(product => (
            <div key={product._id} className={styles.menuCard} onClick={() => addToPosCart(product)}>
              {product.imageUrl && (
                <div 
                  style={{ 
                    height: '120px', 
                    width: '100%', 
                    backgroundImage: `url(${product.imageUrl})`, 
                    backgroundSize: '100% 100%', 
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }} 
                />
              )}
              {!product.imageUrl && (
                <div 
                  style={{ 
                    height: '120px', 
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
                <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, -1)}>-</button>
                <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, 1)}>+</button>
                <button 
                  className={styles.removeBtn} 
                  onClick={() => removeFromCart(item._id)}
                  style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ×
                </button>
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
            {['Cash', 'Card', 'Transfer', 'PR'].map(method => (
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
                placeholder="PR Comment (e.g. MD's Guest)"
                value={prComment}
                onChange={e => setPrComment(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', marginTop: '1rem' }}
              />
              <small style={{color: '#eab308', display: 'block', marginTop: '0.5rem'}}>Requires Manager Approval later</small>
            </div>
          )}

          <button 
            className={`btn-primary ${styles.checkoutBtn}`} 
            onClick={handleCheckout}
            disabled={posCart.length === 0 || isCheckingOut}
            style={{ marginTop: '1rem', width: '100%', opacity: isCheckingOut ? 0.7 : 1 }}
          >
            {isCheckingOut ? 'Processing...' : 'Confirm & Print Receipt'}
          </button>
        </div>
      </div>

      {/* Receipt Print Modal */}
      {showReceipt && lastOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.printArea}`} ref={receiptRef}>
            <div className={styles.receipt}>
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />
              </div>
              <h2>{settings?.storeName || "Cyril's Foods"}</h2>
              <p>{settings?.address || "92, YAYA ABATAN ROAD, OPPOSITE NNPC FILLING STATION, OGBA"}</p>
              <div className={styles.receiptDivider}></div>
              <p>Receipt ID: {lastOrder._id}</p>
              <p>Date: {lastOrder.date}</p>
              <p><strong>Sales Rep:</strong> {lastOrder.salesPersonName}</p>
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
