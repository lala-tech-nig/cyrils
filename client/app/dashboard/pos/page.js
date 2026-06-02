"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import styles from './page.module.css';
import { useToast } from '../../../context/ToastContext';
import { flushSync } from 'react-dom';

// ─── Inline Confirm Modal ────────────────────────────────────────────
const ConfirmModal = ({ modal, onConfirm, onCancel }) => {
  if (!modal.open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '2rem 2rem 1.5rem',
        maxWidth: '380px', width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)', animation: 'popIn 0.25s ease'
      }}>
        <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
          {modal.icon || '⚠️'}
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', marginBottom: '0.5rem' }}>
          {modal.title || 'Are you sure?'}
        </h2>
        {modal.message && (
          <p style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {modal.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: modal.danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f97316,#ea580c)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: modal.danger ? '0 4px 14px rgba(239,68,68,0.35)' : '0 4px 14px rgba(249,115,22,0.35)' }}
          >
            {modal.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function POSPage() {
  const { user, socket } = useAppContext();
  const toast = useToast();
  
  const [products, setProducts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('FOOD');
  const [searchTerm, setSearchTerm] = useState('');
  const categories = ['FOOD', 'PROTEIN', 'SOUP', 'SWALLOW', 'SIDE', 'DRINK', 'PACK', 'ICE CREAM', 'PASTRY'];
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [prComment, setPrComment] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [settings, setSettings] = useState(null);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [mixedPayments, setMixedPayments] = useState({ cash: '', fcmb1: '', fcmb2: '', nomba: '', gtbank: '' });
  
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('None');
  const [discountOtp, setDiscountOtp] = useState('');
  
  const [currentPack, setCurrentPack] = useState(1);
  const [totalPacks, setTotalPacks] = useState(1);
  
  const [waitingSelfOrders, setWaitingSelfOrders] = useState([]);
  const [activeSelfOrderId, setActiveSelfOrderId] = useState(null);
  const [showAllSelfOrders, setShowAllSelfOrders] = useState(false);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const confirmResolveRef = useRef(null);

  const openConfirm = useCallback((options) => new Promise(resolve => {
    confirmResolveRef.current = resolve;
    setConfirmModal({ open: true, ...options });
  }), []);

  const handleConfirmOk = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(true);
  };
  const handleConfirmCancel = () => {
    setConfirmModal({ open: false });
    confirmResolveRef.current?.(false);
  };
  
  // Pending Orders Widget Dragging State
  const [pendingPosition, setPendingPosition] = useState({ x: 0, y: 0 });
  const [isPendingDragging, setIsPendingDragging] = useState(false);
  const pendingDragOffset = useRef({ x: 0, y: 0 });
  
  const receiptRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewSelfOrder = (order) => {
      setWaitingSelfOrders(prev => {
        // Prevent duplicate appending
        if (prev.some(o => o._id === order._id)) return prev;
        return [...prev, order];
      });
      toast.info(`New self-order from ${order.customerName || 'Customer'}`);
    };
    
    const handleOrderCompleted = (order) => {
      setWaitingSelfOrders(prev => prev.filter(o => o._id !== order._id));
    };

    socket.on('new_self_order', handleNewSelfOrder);
    socket.on('order_completed', handleOrderCompleted);

    return () => {
      socket.off('new_self_order', handleNewSelfOrder);
      socket.off('order_completed', handleOrderCompleted);
    };
  }, [socket]); // Removed toast to prevent rapid re-mounting

  // Broadcast cart changes to VFD screen
  useEffect(() => {
    localStorage.setItem('vfd_cart', JSON.stringify(posCart));
    localStorage.setItem('vfd_total', totalAmount.toString());
  }, [posCart]);

  // Handle Dragging for Pending Orders Widget
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isPendingDragging) return;
      setPendingPosition({
        x: e.clientX - pendingDragOffset.current.x,
        y: e.clientY - pendingDragOffset.current.y
      });
    };
    const handleMouseUp = () => setIsPendingDragging(false);

    if (isPendingDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPendingDragging]);

  const handlePendingMouseDown = (e) => {
    setIsPendingDragging(true);
    pendingDragOffset.current = {
      x: e.clientX - pendingPosition.x,
      y: e.clientY - pendingPosition.y
    };
  };

  const fetchData = async () => {
    try {
      const [prodRes, settRes, transRes, custRes, ordersRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings'),
        api.get('/transfers/pending'),
        api.get('/customers'),
        api.get('/orders?type=WalkIn')
      ]);
      const sortedProducts = prodRes.data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setProducts(sortedProducts);
      setSettings(settRes.data);
      setPendingTransfers(transRes.data);
      setCustomers(custRes.data);
      if (ordersRes.data) {
        setWaitingSelfOrders(ordersRes.data.filter(o => o.status === 'Pending').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }
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
      let effectivePrice = product.price;
      if (product.discountPercent > 0 && product.discountExpiry && new Date(product.discountExpiry) > new Date()) {
        effectivePrice = product.price - (product.price * (product.discountPercent / 100));
      }
      const taxAmount = effectivePrice * ((product.taxPercent || 0) / 100);

      const existing = prev.find(item => item._id === product._id && item.packNumber === currentPack);
      if (existing) {
        return prev.map(item => (item._id === product._id && item.packNumber === currentPack) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, price: effectivePrice, originalPrice: product.price, unitTax: taxAmount, quantity: 1, packNumber: currentPack }];
    });
  };

  const updateQuantity = (id, packNumber, delta) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item._id === id && item.packNumber === packNumber) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id, packNumber) => {
    setPosCart(prev => prev.filter(item => !(item._id === id && item.packNumber === packNumber)));
  };

  const subTotalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity) + ((item.unitTax || 0) * item.quantity), 0);
  let totalAmount = subTotalAmount;
  if (discountType === 'Percentage' && Number(discountAmount) > 0) {
    totalAmount -= (subTotalAmount * (Number(discountAmount) / 100));
  } else if (discountType === 'Flat' && Number(discountAmount) > 0) {
    totalAmount -= Number(discountAmount);
  }
  totalAmount = Math.max(0, totalAmount);

  const handlePendOrder = () => {
    if (posCart.length === 0) return;
    const pendingId = Date.now().toString();
    setPendingOrders(prev => [...prev, { id: pendingId, cart: [...posCart], time: new Date(), currentPack, totalPacks }]);
    setPosCart([]);
    setCurrentPack(1);
    setTotalPacks(1);
    toast.info('Order pended successfully');
  };

  const handleResumeOrder = (id) => {
    const pended = pendingOrders.find(o => o.id === id);
    if (!pended) return;
    if (posCart.length > 0) {
      toast.warning('Please complete, clear, or pend the current active order first.');
      return;
    }
    setPosCart(pended.cart);
    setCurrentPack(pended.currentPack || 1);
    setTotalPacks(pended.totalPacks || 1);
    setPendingOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleClearAll = async (force = false) => {
    if (!force) {
      const ok = await openConfirm({ title: 'Clear Order?', message: 'This will remove all items and reset the current order.', icon: '🗑️', confirmText: 'Clear All', danger: true });
      if (!ok) return;
    }
    setPosCart([]);
    setCurrentPack(1);
    setTotalPacks(1);
    setPrComment('');
    setMixedPayments({ cash: '', fcmb1: '', fcmb2: '', nomba: '', gtbank: '' });
    setDiscountAmount('');
    setDiscountType('None');
    setDiscountOtp('');
    setActiveSelfOrderId(null);
  };

  const loadSelfOrder = async (order) => {
    if (posCart.length > 0) {
      const ok = await openConfirm({ title: 'Replace Current Order?', message: 'Your current cart will be cleared to load this customer\'s order.', icon: '🔄', confirmText: 'Load Order' });
      if (!ok) return;
    }
    const newCart = order.items.map(item => {
      const prod = products.find(p => p._id === (item.product._id || item.product));
      return {
        _id: prod ? prod._id : (item.product._id || item.product),
        name: prod ? prod.name : 'Unknown Product',
        price: item.priceAtTime,
        quantity: item.quantity,
        packNumber: item.packNumber || 1
      };
    });
    
    setPosCart(newCart);
    setActiveSelfOrderId(order._id);
    
    const maxPack = Math.max(1, ...newCart.map(i => i.packNumber || 1));
    setTotalPacks(maxPack);
    setCurrentPack(1);
    toast.success(`Loaded order for ${order.customerName || 'Customer'}`);
  };

  const removeSelfOrder = async (id) => {
    const ok = await openConfirm({ title: 'Dismiss Self-Order?', message: 'Customer could not be located on the premises. This order will be declined.', icon: '🚫', confirmText: 'Dismiss', danger: true });
    if (!ok) return;
    try {
      await api.put(`/orders/${id}/status`, { status: 'Declined' });
      setWaitingSelfOrders(prev => prev.filter(o => o._id !== id));
      toast.success('Self-order removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove self-order');
    }
  };

  const handleCheckout = () => {
    if (posCart.length === 0) return;
    if (paymentMethod === 'PR' && !prComment.trim()) {
      toast.warning("Please enter a PR comment (e.g., 'MD's Guest').");
      return;
    }
    if (paymentMethod === 'Mixed') {
      const cashAmt = Number(mixedPayments.cash) || 0;
      const fcmb1Amt = Number(mixedPayments.fcmb1) || 0;
      const fcmb2Amt = Number(mixedPayments.fcmb2) || 0;
      const nombaAmt = Number(mixedPayments.nomba) || 0;
      const gtbankAmt = Number(mixedPayments.gtbank) || 0;
      const totalMixed = cashAmt + fcmb1Amt + fcmb2Amt + nombaAmt + gtbankAmt;
      if (totalMixed !== totalAmount) {
        toast.warning(`Mixed payment amounts (₦${totalMixed}) must equal the total amount (₦${totalAmount}).`);
        return;
      }
    }

    if (paymentMethod === 'Customer Account' && !selectedCustomerId) {
      toast.warning('Please select a customer account to charge.');
      return;
    }
    
    if (paymentMethod === 'Customer Account') {
      const customer = customers.find(c => c._id === selectedCustomerId);
      if (!customer || customer.walletBalance < totalAmount) {
        toast.warning('Insufficient wallet balance for this customer.');
        return;
      }
    }

    const orderPreview = {
      _id: 'Pending Save...',
      items: posCart,
      totalAmount,
      subTotalAmount,
      discountType,
      discountAmount: Number(discountAmount) || 0,
      paymentMethod,
      customerId: paymentMethod === 'Customer Account' ? selectedCustomerId : undefined,
      prComment: paymentMethod === 'PR' ? prComment : '',
      salesPersonName: user?.username || 'Unknown Staff',
      date: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    };
    
    setLastOrder(orderPreview);
    setShowReceipt(true);
  };

  const printReceipt = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);

    const orderData = {
      orderType: 'WalkIn',
      items: posCart.map(item => ({ product: item._id, quantity: item.quantity, priceAtTime: item.price, packNumber: item.packNumber })),
      totalAmount,
      discountType,
      discountAmount: Number(discountAmount) || 0,
      discountOtp,
      status: 'Completed',
      paymentMethod,
      customerId: paymentMethod === 'Customer Account' ? selectedCustomerId : undefined,
      prComment: paymentMethod === 'PR' ? prComment : '',
      mixedPayments: paymentMethod === 'Mixed' ? {
        cash: Number(mixedPayments.cash) || 0,
        fcmb1: Number(mixedPayments.fcmb1) || 0,
        fcmb2: Number(mixedPayments.fcmb2) || 0,
        nomba: Number(mixedPayments.nomba) || 0,
        gtbank: Number(mixedPayments.gtbank) || 0
      } : undefined,
      salesPersonName: user?.username || 'Unknown Staff'
    };

    try {
      let res;
      if (activeSelfOrderId) {
        res = await api.put(`/orders/${activeSelfOrderId}/complete`, orderData);
      } else {
        res = await api.post('/orders', orderData);
      }
      const savedOrder = res.data;
      
      const orderToPrint = {
        ...lastOrder,
        _id: savedOrder._id,
        date: new Date(savedOrder.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      };
      
      flushSync(() => {
        setLastOrder(orderToPrint);
      });
      
      window.print();
      
      handleClearAll(true);
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

  const openVFDScreen = () => {
    const leftPos = window.screen.width;
    window.open('/vfd', '_blank', `width=1024,height=768,left=${leftPos},top=0`);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = (p.category || '').toUpperCase() === selectedCategory;
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

        {/* Self Orders Section */}
        {waitingSelfOrders.length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem' }}>👥 Customer Self-Orders ({waitingSelfOrders.length})</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: showAllSelfOrders ? 'wrap' : 'nowrap', overflowX: showAllSelfOrders ? 'visible' : 'auto', paddingBottom: '0.5rem' }}>
              {(showAllSelfOrders ? waitingSelfOrders : waitingSelfOrders.slice(0, 3)).map(o => (
                <div key={o._id} style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', minWidth: '220px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#f97316' }}>{o.customerName || 'Walk-In'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{o.items.length} items | {new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      onClick={() => loadSelfOrder(o)}
                      style={{ background: '#f97316', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Load
                    </button>
                    <button 
                      onClick={() => removeSelfOrder(o._id)}
                      style={{ background: '#f1f5f9', color: '#ef4444', border: '1px solid #cbd5e1', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      title="Dismiss if customer is not found"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {!showAllSelfOrders && waitingSelfOrders.length > 3 && (
                <button 
                  onClick={() => setShowAllSelfOrders(true)}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  +{waitingSelfOrders.length - 3} More
                </button>
              )}
              {showAllSelfOrders && waitingSelfOrders.length > 3 && (
                <button 
                  onClick={() => setShowAllSelfOrders(false)}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  Show Less
                </button>
              )}
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
            {/* <button 
              className={styles.shiftBtn} 
              onClick={openVFDScreen}
              style={{ background: '#8b5cf6', color: 'white', whiteSpace: 'nowrap' }}
            >
              🖥️ Open VFD Screen
            </button> */}
          </div>
        </div>
        
        <div className={styles.menuGrid}>
          {filteredProducts.map(product => (
            <div key={product._id} className={styles.menuCard} onClick={() => addToPosCart(product)}>
              <div 
                className={styles.imagePlaceholder} 
                style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : {}}
              >
                {!product.imageUrl && 'No Image'}
                <div className={styles.addBadge}>+</div>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.menuItemName}>{product.name}</div>
                <div className={styles.menuItemPrice}>₦{product.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className={styles.cartSection}>
        <h2 className={styles.cartTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Current Order
        </h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          {Array.from({ length: totalPacks }).map((_, i) => (
            <button 
              key={`pack-${i+1}`}
              onClick={() => setCurrentPack(i+1)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: currentPack === i+1 ? '2px solid #f97316' : '1px solid #ddd',
                background: currentPack === i+1 ? '#fff7ed' : '#fff',
                color: currentPack === i+1 ? '#ea580c' : '#666',
                fontWeight: currentPack === i+1 ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Pack {i+1}
            </button>
          ))}
          <button 
            onClick={() => {
              setTotalPacks(prev => prev + 1);
              setCurrentPack(totalPacks + 1);
            }}
            style={{
              padding: '0.5rem 1rem', borderRadius: '6px', border: '1px dashed #94a3b8', background: '#f8fafc', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            + Add Pack
          </button>
        </div>
        
        {activeSelfOrderId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff7ed', border: '1px solid #fdba74', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 'bold', color: '#c2410c' }}>
              Handling Self-Order
            </div>
            <button 
              onClick={() => { setActiveSelfOrderId(null); handleClearAll(true); }}
              style={{ background: '#fff', border: '1px solid #fdba74', color: '#ea580c', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Return to Waiting
            </button>
          </div>
        )}

        <div className={styles.cartItems}>
          {posCart.length === 0 && <p style={{color: '#999', textAlign:'center'}}>Cart is empty</p>}
          {Array.from({ length: totalPacks }).map((_, packIdx) => {
            const packNum = packIdx + 1;
            const packItems = posCart.filter(item => item.packNumber === packNum);
            
            if (packItems.length === 0 && posCart.length > 0) return null;
            
            return (
              <div key={`cart-pack-${packNum}`} style={{ marginBottom: '1rem' }}>
                {totalPacks > 1 && packItems.length > 0 && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '0.5rem' }}>
                    --- Pack {packNum} ---
                  </div>
                )}
                {packItems.map(item => (
                  <div key={`${item._id}-${item.packNumber}`} className={styles.cartItem} style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{fontWeight: 'bold'}}>{item.name}</div>
                      <div style={{fontSize: '0.9rem', color: '#666'}}>₦{item.price}</div>
                    </div>
                    <div className={styles.qtyControl}>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, item.packNumber, -1)}>-</button>
                      <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, item.packNumber, 1)}>+</button>
                      <button 
                        className={styles.removeBtn} 
                        onClick={() => removeFromCart(item._id, item.packNumber)}
                        style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className={styles.cartSummary}>
          <div className={styles.totalRow}>
            <span>Total</span>
            <span>₦{totalAmount}</span>
          </div>

          <div style={{ marginTop: '1rem', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Apply Discount</span>
              <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountAmount(''); }} style={{ border: 'none', background: 'transparent', fontWeight: 'bold', color: '#f97316', cursor: 'pointer' }}>
                <option value="None">None</option>
                <option value="Percentage">Percentage (%)</option>
                <option value="Flat">Flat Amount (₦)</option>
              </select>
            </div>
            {discountType !== 'None' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" placeholder={discountType === 'Percentage' ? '% Value' : '₦ Amount'} value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className={styles.prInput} style={{ flex: 1, marginBottom: 0 }} />
                <input type="text" placeholder="Manager OTP" value={discountOtp} onChange={e => setDiscountOtp(e.target.value)} className={styles.prInput} style={{ flex: 1, marginBottom: 0, border: '1px solid #f97316' }} />
              </div>
            )}
          </div>

          <div className={styles.paymentMethods}>
            {['Cash', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK', 'Customer Account', 'Mixed', 'PR'].map(method => (
              <button 
                key={method}
                className={`${styles.payBtn} ${paymentMethod === method ? styles.selected : ''}`}
                onClick={() => setPaymentMethod(method)}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === 'Customer Account' && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Select Registered Customer:</div>
              <select className={styles.prInput} style={{ marginBottom: 0 }} value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.phone}) - Bal: ₦{c.walletBalance?.toLocaleString()}</option>
                ))}
              </select>
            </div>
          )}

          {paymentMethod === 'Mixed' && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>Split Payment Amounts:</div>
              <input type="number" placeholder="Cash Amount" value={mixedPayments.cash} onChange={e => setMixedPayments({...mixedPayments, cash: e.target.value})} className={styles.prInput} style={{ marginBottom: 0 }} />
              <input type="number" placeholder="FCMB 1 Amount" value={mixedPayments.fcmb1} onChange={e => setMixedPayments({...mixedPayments, fcmb1: e.target.value})} className={styles.prInput} style={{ marginBottom: 0 }} />
              <input type="number" placeholder="FCMB 2 Amount" value={mixedPayments.fcmb2} onChange={e => setMixedPayments({...mixedPayments, fcmb2: e.target.value})} className={styles.prInput} style={{ marginBottom: 0 }} />
              <input type="number" placeholder="Nomba Amount" value={mixedPayments.nomba} onChange={e => setMixedPayments({...mixedPayments, nomba: e.target.value})} className={styles.prInput} style={{ marginBottom: 0 }} />
              <input type="number" placeholder="GT BANK Amount" value={mixedPayments.gtbank} onChange={e => setMixedPayments({...mixedPayments, gtbank: e.target.value})} className={styles.prInput} style={{ marginBottom: 0 }} />
              <div style={{ fontSize: '0.9rem', color: ((Number(mixedPayments.cash)||0) + (Number(mixedPayments.fcmb1)||0) + (Number(mixedPayments.fcmb2)||0) + (Number(mixedPayments.nomba)||0) + (Number(mixedPayments.gtbank)||0)) === totalAmount ? '#16a34a' : '#ef4444', textAlign: 'right', fontWeight: 'bold', marginTop: '0.5rem' }}>
                Remaining: ₦{totalAmount - ((Number(mixedPayments.cash)||0) + (Number(mixedPayments.fcmb1)||0) + (Number(mixedPayments.fcmb2)||0) + (Number(mixedPayments.nomba)||0) + (Number(mixedPayments.gtbank)||0))}
              </div>
            </div>
          )}

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

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn-secondary`} 
              onClick={handlePendOrder}
              disabled={posCart.length === 0 || isCheckingOut || activeSelfOrderId}
              style={{ flex: 1, padding: '1rem', opacity: (posCart.length === 0 || activeSelfOrderId) ? 0.5 : 1, fontWeight: 'bold', fontSize: '0.9rem', borderRadius: '8px', minWidth: '120px' }}
            >
              ⏳ Pend
            </button>
            <button 
              className={`btn-secondary`} 
              onClick={() => handleClearAll()}
              disabled={posCart.length === 0 || isCheckingOut}
              style={{ flex: 1, padding: '1rem', opacity: posCart.length === 0 ? 0.5 : 1, fontWeight: 'bold', fontSize: '0.9rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', border: 'none', minWidth: '120px' }}
            >
              🗑️ Clear All
            </button>
            <button 
              className={`btn-primary ${styles.checkoutBtn}`} 
              onClick={handleCheckout}
              disabled={posCart.length === 0}
              style={{ flex: 2, margin: 0, padding: '1rem', borderRadius: '8px', minWidth: '150px' }}
            >
              Preview Receipt
            </button>
          </div>
        </div>

        {/* Pending Orders Floating Side Panel */}
        {pendingOrders.length > 0 && (
          <div 
            style={{ 
              position: 'fixed', left: '15px', top: '350px', background: '#fff', border: '2px solid #f97316', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: isPendingDragging ? 9999 : 100, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto', width: '220px',
              transform: `translate(${pendingPosition.x}px, ${pendingPosition.y}px)`,
              transition: isPendingDragging ? 'none' : 'transform 0.1s'
            }}
          >
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem', cursor: isPendingDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handlePendingMouseDown}
            >
              <h3 style={{ fontSize: '1rem', margin: 0, color: '#0f172a', pointerEvents: 'none' }}>⏳ Pending ({pendingOrders.length})</h3>
            </div>
            {pendingOrders.map((o, idx) => (
              <button key={o.id} onClick={() => handleResumeOrder(o.id)} style={{ padding: '0.75rem', border: '1px solid #fdba74', background: '#fff7ed', borderRadius: '8px', color: '#ea580c', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 'bold' }}>Order #{idx + 1}</div>
                <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '4px' }}>{o.cart.length} items • {o.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </button>
            ))}
          </div>
        )}
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
                  {(() => {
                    const packs = [...new Set(lastOrder.items.map(item => item.packNumber || 1))].sort((a,b) => a - b);
                    if (packs.length <= 1) {
                      return lastOrder.items.map(item => (
                        <tr key={`${item._id}-${item.packNumber}`}>
                          <td>{item.name}</td>
                          <td className={styles.textRight}>{item.quantity}</td>
                          <td className={styles.textRight}>{item.price * item.quantity}</td>
                        </tr>
                      ));
                    }
                    
                    return packs.map(packNum => {
                      const packItems = lastOrder.items.filter(i => (i.packNumber || 1) === packNum);
                      if (packItems.length === 0) return null;
                      return (
                        <Fragment key={`receipt-pack-${packNum}`}>
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', fontWeight: 'bold', borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '4px 0' }}>
                              --- Pack {packNum} ---
                            </td>
                          </tr>
                          {packItems.map(item => (
                            <tr key={`${item._id}-${item.packNumber}`}>
                              <td>{item.name}</td>
                              <td className={styles.textRight}>{item.quantity}</td>
                              <td className={styles.textRight}>{item.price * item.quantity}</td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>

              <div className={styles.receiptDivider}></div>
              {lastOrder.discountAmount > 0 && (
                <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                  <p style={{ margin: '0.2rem 0' }}>Subtotal: ₦{lastOrder.subTotalAmount}</p>
                  <p style={{ margin: '0.2rem 0', color: '#f97316' }}>
                    Discount: -₦{lastOrder.discountType === 'Percentage' ? (lastOrder.subTotalAmount * (lastOrder.discountAmount / 100)) : lastOrder.discountAmount}
                  </p>
                </div>
              )}
              <h3 style={{textAlign: 'right', margin: '0.5rem 0'}}>TOTAL: ₦{lastOrder.totalAmount}</h3>
              <div className={styles.receiptDivider}></div>
              <p>Thank you for dining with us!</p>
              <p>Please come again.</p>
              
              <div className="no-print" style={{marginTop: '2rem', display: 'flex', gap: '1rem'}}>
                <button className="btn-primary" style={{flex: 1, opacity: isCheckingOut ? 0.7 : 1}} onClick={printReceipt} disabled={isCheckingOut}>
                  {isCheckingOut ? 'Saving...' : 'Save & Print'}
                </button>
                <button className="btn-secondary" style={{flex: 1}} onClick={() => setShowReceipt(false)} disabled={isCheckingOut}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        modal={confirmModal}
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}
