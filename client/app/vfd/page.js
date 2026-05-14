"use client";

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import styles from './vfd.module.css';

export default function VFDScreen() {
  const [promotions, setPromotions] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState("0");

  // Fetch promotions on load
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const res = await api.get('/promotions');
        setPromotions(res.data);
      } catch (err) {
        console.error('Failed to fetch promotions for VFD', err);
      }
    };
    fetchPromotions();
  }, []);

  // Ad rotation interval (every 8 seconds)
  useEffect(() => {
    if (promotions.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % promotions.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [promotions]);

  // Listen to LocalStorage events from the POS screen
  useEffect(() => {
    // Initial load from storage just in case POS is already open
    const initialCart = localStorage.getItem('vfd_cart');
    const initialTotal = localStorage.getItem('vfd_total');
    if (initialCart) setCart(JSON.parse(initialCart));
    if (initialTotal) setTotal(initialTotal);

    const handleStorageChange = (e) => {
      if (e.key === 'vfd_cart') {
        try {
          setCart(JSON.parse(e.newValue || '[]'));
        } catch (err) {
          setCart([]);
        }
      } else if (e.key === 'vfd_total') {
        setTotal(e.newValue || "0");
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className={styles.vfdContainer}>
      {/* Left Pane - Promotions */}
      <div className={styles.adsPane}>
        {promotions.length > 0 ? (
          promotions.map((promo, index) => (
            promo.mediaType === 'video' ? (
              <video 
                key={promo._id || index}
                src={promo.imageUrl} 
                className={`${styles.adImage} ${index === currentAdIndex ? styles.active : ''}`}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img 
                key={promo._id || index}
                src={promo.imageUrl} 
                alt={promo.title || 'Promotion'} 
                className={`${styles.adImage} ${index === currentAdIndex ? styles.active : ''}`}
              />
            )
          ))
        ) : (
          <div className={styles.noAds}>
            <h2>Welcome to Cyril's Foods</h2>
            <p>Delicious meals awaiting...</p>
          </div>
        )}
      </div>

      {/* Right Pane - Cart Info */}
      <div className={styles.cartPane}>
        <div className={styles.header}>
          <h1>Your Order</h1>
          <p>Please review your items</p>
        </div>

        <div className={styles.cartList}>
          {cart.length > 0 ? (
            cart.map((item, idx) => (
              <div key={item._id || idx} className={styles.cartItem}>
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemPrice}>₦{item.price} x {item.quantity}</span>
                </div>
                <div className={styles.itemTotal}>
                  ₦{(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyCart}>
              <h2>No items yet</h2>
              <p>Your order will appear here</p>
            </div>
          )}
        </div>

        <div className={styles.totalSection}>
          <div className={styles.totalLabel}>Total Due:</div>
          <div className={styles.totalValue}>₦{Number(total).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
