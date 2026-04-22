"use client";

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function CheckoutPage() {
  const { cart, removeFromCart, clearCart, socket } = useAppContext();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const totalAmount = cart.reduce((total, item) => total + (item.priceAtTime * item.quantity), 0);

  const handleCheckout = async (e) => {
    e.submitter?.blur();
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);

    const orderData = {
      items: cart.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime
      })),
      totalAmount,
      customerName,
      customerPhone,
      orderType: 'Online',
      paymentMethod: 'Online' // Simplified for now
    };

    try {
      const res = await fetch('http://localhost:5000/api/orders/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        clearCart();
        // Redirect to WhatsApp
        const waMessage = `Hello Cyril's Foods! I just placed an order for ${customerName}. Total: ₦${totalAmount}.`;
        const waLink = `https://wa.me/2340000000000?text=${encodeURIComponent(waMessage)}`;
        
        window.open(waLink, '_blank');
        router.push('/');
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('Error placing order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Checkout</h1>
        <div className={styles.emptyState}>
          Your cart is empty. <br/><br/>
          <button className="btn-primary" onClick={() => router.push('/')}>Go back to Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Review Your Order</h1>
      
      <div className={styles.cartList}>
        {cart.map(item => (
          <div key={item.product._id} className={styles.cartItem}>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{item.product.name}</span>
              <span className={styles.itemPrice}>₦{item.priceAtTime} x {item.quantity}</span>
            </div>
            <div className={styles.itemActions}>
              <span className={styles.quantity}>₦{item.priceAtTime * item.quantity}</span>
              <button className={styles.removeBtn} onClick={() => removeFromCart(item.product._id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <span>Total:</span>
        <span>₦{totalAmount}</span>
      </div>

      <form className={styles.checkoutForm} onSubmit={handleCheckout}>
        <div className={styles.inputGroup}>
          <label>Your Name</label>
          <input 
            type="text" 
            required 
            value={customerName} 
            onChange={e => setCustomerName(e.target.value)} 
            placeholder="John Doe"
          />
        </div>
        <div className={styles.inputGroup}>
          <label>WhatsApp Number</label>
          <input 
            type="tel" 
            required 
            value={customerPhone} 
            onChange={e => setCustomerPhone(e.target.value)} 
            placeholder="e.g. 08012345678"
          />
        </div>
        <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Confirm Order & Checkout via WhatsApp'}
        </button>
      </form>
    </div>
  );
}
