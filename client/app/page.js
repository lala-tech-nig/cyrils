"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './page.module.css';
import Link from 'next/link';

export default function LandingPage() {
  const { cart, addToCart } = useAppContext();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch active products
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        } else {
          // Empty array if fetch fails, no fallback dummy data
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div>
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <span>🍲 Cyril's Foods</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/login" className="btn-secondary">Staff Login</Link>
          <Link href="/checkout" className={styles.cartBtn}>
            🛒 Cart
            {totalCartItems > 0 && <span className={styles.badge}>{totalCartItems}</span>}
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        {/* Placeholder for Carousel */}
        <div className={styles.heroContent}>
          <h1>Taste the Magic of Home</h1>
          <p>Order fresh, delicious meals directly from our kitchen to your table.</p>
          <a href="#menu" className="btn-primary" style={{ display: 'inline-block' }}>Order Now</a>
        </div>
      </section>

      <section id="menu" className={styles.menuSection}>
        <h2 className={styles.sectionTitle}>Our <span>Menu</span></h2>
        
        <div className={styles.grid}>
          {products.map((product) => (
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
        </div>
      </section>
    </div>
  );
}
