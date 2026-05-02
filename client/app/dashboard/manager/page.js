"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';

export default function ManagerDashboard() {
  const { user } = useAppContext();
  const [stats, setStats] = useState({
    totalSales: 0, ordersCount: 0, onlineOrders: 0, walkInOrders: 0, cashReceived: 0, transferReceived: 0
  });
  const [prRequests, setPrRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Main', imageUrl: '' });

  useEffect(() => {
    fetchStats();
    fetchProducts();
    // PR requests endpoint doesn't exist yet, initializing empty
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setNewProduct({ name: '', price: '', category: 'Main', imageUrl: '' });
        fetchProducts();
        alert('Menu item created successfully');
      } else {
        alert('Error creating product');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || (user.role !== 'Manager' && user.role !== 'SuperAdmin')) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Manager Overview</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Daily Sales</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-orange)' }}>₦{stats.totalSales.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Orders</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>{stats.ordersCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cash Received</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>₦{stats.cashReceived.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Transfers/POS</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>₦{stats.transferReceived.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Menu Management */}
        <div style={{ flex: '1 1 300px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Create Menu Item</h2>
          <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Item Name</label>
              <input type="text" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Price (₦)</label>
              <input type="number" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Category</label>
              <select style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="Main">Main</option>
                <option value="Swallow">Swallow</option>
                <option value="Proteins">Proteins</option>
                <option value="Drinks">Drinks</option>
                <option value="Sides">Sides</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Image URL (optional)</label>
              <input type="url" style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add to Menu</button>
          </form>
        </div>

        <div style={{ flex: '2 1 500px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Current Menu</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{p.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{p.category}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>₦{p.price}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <button onClick={() => deleteProduct(p._id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontWeight: '500' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No menu items found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
