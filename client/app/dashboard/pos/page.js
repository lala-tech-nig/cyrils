"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import styles from './page.module.css';

export default function POSPage() {
  const { user } = useAppContext();
  const [products, setProducts] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [prComment, setPrComment] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  
  const receiptRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => {
        // Fallback
        setProducts([
          { _id: '1', name: 'Jollof Rice & Chicken', price: 3500 },
          { _id: '2', name: 'Fried Rice & Beef', price: 4000 },
          { _id: '3', name: 'Pounded Yam', price: 1500 },
          { _id: '4', name: 'Egusi Soup', price: 2000 },
        ]);
      });
  }, []);

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
      orderType: 'WalkIn',
      items: posCart.map(item => ({ product: item._id, quantity: item.quantity, priceAtTime: item.price })),
      totalAmount,
      status: 'Completed',
      paymentMethod,
      prComment: paymentMethod === 'PR' ? prComment : '',
      salesPerson: user?.id,
      salesPersonName: user?.username || 'Unknown Staff'
    };

    // Real API call here
    // try { await fetch(...) } catch (e) {}

    // Mock successful order for demo
    const completedOrder = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleString(),
      items: posCart
    };

    setLastOrder(completedOrder);
    setShowReceipt(true);
  };

  const printReceipt = () => {
    window.print();
    // After printing, clear cart and close modal
    setPosCart([]);
    setPrComment('');
    setShowReceipt(false);
  };

  return (
    <div className={styles.posContainer}>
      {/* Menu Section */}
      <div className={styles.menuSection}>
        <div className={styles.header}>
          <h1 className={styles.title}>Walk-in Orders</h1>
          <button className={styles.shiftBtn}>Close Shift</button>
        </div>
        
        <div className={styles.menuGrid}>
          {products.map(product => (
            <div key={product._id} className={styles.menuCard} onClick={() => addToPosCart(product)}>
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
                <span>{item.quantity}</span>
                <button className={styles.qtyBtn} onClick={() => updateQuantity(item._id, 1)}>+</button>
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

      {/* Receipt Print Modal */}
      {showReceipt && lastOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.printArea}`} ref={receiptRef}>
            <div className={styles.receipt}>
              <h2>Cyril's Foods</h2>
              <p>123 Food Avenue, Lagos</p>
              <div className={styles.receiptDivider}></div>
              <p>Receipt ID: {lastOrder.id}</p>
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
