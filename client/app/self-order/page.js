"use client";

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import api from '../../lib/api';
import styles from './page.module.css';

export default function SelfOrderPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState(['FOOD', 'PROTEIN', 'SOUP', 'SWALLOW', 'SIDE', 'DRINK', 'PACK', 'ICE CREAM', 'PASTRY']);
  const [selectedCategory, setSelectedCategory] = useState('FOOD');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPack, setCurrentPack] = useState(1);
  const [totalPacks, setTotalPacks] = useState(1);
  const [customerName, setCustomerName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Mobile cart overlay state
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Window size for Confetti
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchProducts();
    
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching menu', err);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      let effectivePrice = product.price;
      if (product.discountPercent > 0 && product.discountExpiry && new Date(product.discountExpiry) > new Date()) {
        effectivePrice = product.price - (product.price * (product.discountPercent / 100));
      }

      const existing = prev.find(item => item.product === product._id && item.packNumber === currentPack);
      if (existing) {
        return prev.map(item => (item.product === product._id && item.packNumber === currentPack) 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { 
        product: product._id, 
        name: product.name, 
        priceAtTime: effectivePrice, 
        quantity: 1, 
        packNumber: currentPack 
      }];
    });
  };

  const updateQuantity = (productId, packNumber, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product === productId && item.packNumber === packNumber) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return alert('Please add items to your order.');
    if (!customerName.trim()) return alert('Please enter your name so we can call you.');

    setIsSubmitting(true);
    
    const subTotal = cart.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
    
    const orderData = {
      customerName: customerName.trim(),
      items: cart.map(i => ({ product: i.product, quantity: i.quantity, priceAtTime: i.priceAtTime, packNumber: i.packNumber })),
      totalAmount: subTotal,
      subTotalAmount: subTotal,
      discountAmount: 0,
      discountType: 'None'
    };

    try {
      await api.post('/orders/self-order', orderData);
      setIsSuccess(true);
      setIsCartOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to send order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPage = () => {
    setCart([]);
    setCustomerName('');
    setCurrentPack(1);
    setTotalPacks(1);
    setIsSuccess(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = (p.category || '').toUpperCase() === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalAmount = cart.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isSuccess) {
    return (
      <div className={styles.successScreen}>
        {windowSize.width > 0 && (
          <Confetti 
            width={windowSize.width} 
            height={windowSize.height} 
            recycle={false} 
            numberOfPieces={600} 
            gravity={0.15}
          />
        )}
        <div className={styles.checkmark}>✓</div>
        <h2>Order Sent!</h2>
        <p>Please wait nearby or find a seat. The cashier will call your name (<strong>{customerName}</strong>) to confirm and process payment.</p>
        <button className={styles.resetBtn} onClick={resetPage}>Place Another Order</button>
      </div>
    );
  }

  const cartContent = (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        Your Tray <span>🛍️</span>
      </div>
      
      <div className={styles.packControls}>
        {Array.from({ length: totalPacks }).map((_, i) => (
          <button 
            key={`pack-${i+1}`}
            onClick={() => setCurrentPack(i+1)}
            className={`${styles.packBtn} ${currentPack === i+1 ? styles.activePack : ''}`}
          >
            Pack {i+1}
          </button>
        ))}
        <button 
          onClick={() => { setTotalPacks(prev => prev + 1); setCurrentPack(totalPacks + 1); }}
          className={styles.addPackBtn}
        >
          + Add
        </button>
      </div>

      <div className={styles.cartScroll}>
        {cart.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem', color: '#94a3b8' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🍽️</span>
            Tap items from the menu to add them here.
          </div>
        )}
        
        {Array.from({ length: totalPacks }).map((_, packIdx) => {
          const packNum = packIdx + 1;
          const packItems = cart.filter(item => item.packNumber === packNum);
          if (packItems.length === 0 && cart.length > 0) return null;
          
          return (
            <div key={`cart-pack-${packNum}`}>
              {totalPacks > 1 && packItems.length > 0 && (
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1rem', marginBottom: '0.5rem' }}>
                  Pack {packNum}
                </div>
              )}
              {packItems.map(item => (
                <div key={`${item.product}-${item.packNumber}`} className={styles.cartItem}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: '600' }}>₦{item.priceAtTime}</div>
                  </div>
                  <div className={styles.qtyControl}>
                    <button className={styles.qtyBtn} onClick={() => updateQuantity(item.product, item.packNumber, -1)}>-</button>
                    <span className={styles.qtyText}>{item.quantity}</span>
                    <button className={styles.qtyBtn} onClick={() => updateQuantity(item.product, item.packNumber, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div className={styles.totalRow}>
          <span>Total</span>
          <span>₦{totalAmount}</span>
        </div>

        <input 
          type="text" 
          placeholder="Your Name (e.g. John)" 
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className={styles.nameInput}
        />
        
        <button 
          className={styles.submitBtn} 
          onClick={submitOrder}
          disabled={isSubmitting || cart.length === 0}
        >
          {isSubmitting ? 'Sending...' : 'Send Order to Cashier'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cyril's Foods</h1>
        <p className={styles.subtitle}>Select your meals and we'll call your name.</p>
      </header>

      <main className={styles.main}>
        {/* Menu Side */}
        <section className={styles.menuSection}>
          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="🔍 Search for a meal..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.nameInput}
              style={{ padding: '0.8rem', fontSize: '1rem', marginBottom: '0.5rem' }}
            />
          </div>

          <div className={styles.categoryFilters}>
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`${styles.filterBtn} ${selectedCategory === cat ? styles.activeFilter : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {filteredProducts.map((product, idx) => (
              <div 
                key={product._id} 
                className={`${styles.card} ${styles.animatedItem}`} 
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => addToCart(product)}
              >
                <div 
                  className={styles.imagePlaceholder} 
                  style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : {}}
                >
                  {!product.imageUrl && 'No Image'}
                  <div className={styles.addBadge}>+</div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.itemName}>{product.name}</div>
                  <div className={styles.itemPrice}>₦{product.price}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop Cart Side */}
        <aside className={styles.cartDesktop}>
          {cartContent}
        </aside>
      </main>

      {/* Mobile Floating Bar */}
      <div className={styles.mobileFloatingBar}>
        <button className={styles.viewTrayBtn} onClick={() => setIsCartOpen(true)}>
          <span>View Tray ({totalItems})</span>
          <span>₦{totalAmount}</span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Overlay */}
      <div className={`${styles.bottomSheetOverlay} ${isCartOpen ? styles.open : ''}`} onClick={(e) => {
        if(e.target === e.currentTarget) setIsCartOpen(false);
      }}>
        <div className={styles.bottomSheetContent}>
          <div className={styles.closeHandle} onClick={() => setIsCartOpen(false)}></div>
          {cartContent}
        </div>
      </div>
    </div>
  );
}
