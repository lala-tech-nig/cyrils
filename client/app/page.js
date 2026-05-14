"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './page.module.css';
import Link from 'next/link';
import api from '../lib/api';

export default function LandingPage() {
  const { cart, addToCart } = useAppContext();
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'FOOD', 'PROTEIN', 'SOUP', 'SWALLOW', 'SIDE', 'DRINK'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, settRes, promoRes] = await Promise.allSettled([
          api.get('/products'),
          api.get('/settings'),
          api.get('/promotions')
        ]);
        
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data);
        if (settRes.status === 'fulfilled') setSettings(settRes.value.data);
        if (promoRes.status === 'fulfilled') setPromotions(promoRes.value.data);
        
      } catch (error) {
        console.error('Unexpected error during fetch:', error);
      }
    };
    fetchData();
  }, []);

  // Carousel auto-play
  useEffect(() => {
    if (promotions.length > 1) {
      const timer = setInterval(() => {
        setCurrentPromoIndex(prev => (prev + 1) % promotions.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [promotions]);

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => (p.category || '').toUpperCase() === selectedCategory);

  return (
    <div>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Link href="/">
            <img src="/logo.png" alt="Cyril's Foods Logo" style={{ height: '40px', objectFit: 'contain' }} />
          </Link>
        </div>
        <div className={styles.navLinks}>
          <Link href="/checkout" className={styles.cartBtn}>
            🛒 Cart
            {totalCartItems > 0 && <span className={styles.badge}>{totalCartItems}</span>}
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        {promotions.length > 0 ? (
          <div className={styles.carouselContainer}>
            {promotions.map((promo, idx) => (
              <div 
                key={promo._id} 
                className={`${styles.carouselSlide} ${idx === currentPromoIndex ? styles.activeSlide : ''}`}
                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${promo.imageUrl})` }}
              >
                <div className={styles.heroContent}>
                  <h1>{promo.title}</h1>
                  <p>{promo.description}</p>
                  <a href="#menu" className="btn-primary" style={{ display: 'inline-block' }}>Order Now</a>
                </div>
              </div>
            ))}
            <div className={styles.carouselDots}>
              {promotions.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`${styles.dot} ${idx === currentPromoIndex ? styles.activeDot : ''}`}
                  onClick={() => setCurrentPromoIndex(idx)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.heroContent}>
            <h1>{settings?.heroTitle || "Taste the Magic of Home"}</h1>
            <p>{settings?.heroSubtitle || "Order fresh, delicious meals directly from our kitchen to your table."}</p>
            <a href="#menu" className="btn-primary" style={{ display: 'inline-block' }}>Order Now</a>
          </div>
        )}
      </section>

      <section id="menu" className={styles.menuSection}>
        {(!settings || settings.isMarketOpen) ? (
          <>
            <h2 className={styles.sectionTitle}>Our <span>Menu</span></h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem', justifyContent: 'center' }}>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    border: '1px solid #f26e22',
                    background: selectedCategory === cat ? '#f26e22' : 'white',
                    color: selectedCategory === cat ? 'white' : '#f26e22',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className={styles.grid}>
              {filteredProducts.map((product) => (
              <div key={product._id} className={styles.card}>
                <div 
                  className={styles.cardImage} 
                  style={{ 
                    backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : 'linear-gradient(45deg, #f26e22, #57a74a)' 
                  }}
                />
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{product.name}</span>
                    <span className={styles.cardPrice}>₦{product.price}</span>
                  </div>
                  <div className={styles.cardCategory}>{product.category}</div>
                  <button 
                    className={`btn-primary ${styles.cardAction}`}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <p style={{textAlign: 'center', gridColumn: '1 / -1', color: '#666'}}>No items in this category.</p>}
          </div>
          </>
        ) : (
          <div className={styles.closedOverlay} style={{ borderRadius: '24px' }}>
            <div className={styles.closedContent}>
              <div className={styles.closedIcon}>🕒</div>
              <h1>Market Closed For Now</h1>
              <p>We are currently not accepting new orders. Please check back later!</p>
              <div className={styles.closedBadge}>Opening Soon</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
