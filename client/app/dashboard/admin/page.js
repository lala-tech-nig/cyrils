"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';

export default function AdminDashboard() {
  const { user } = useAppContext();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Sales' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Main', imageUrl: '' });

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Failed to fetch users', err);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ username: '', password: '', role: 'Sales' });
        fetchUsers();
        alert('User created successfully');
      } else {
        const data = await res.json();
        alert(data.message || 'Error creating user');
      }
    } catch (err) {
      console.error(err);
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

  const toggleUserStatus = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
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

  if (!user || user.role !== 'SuperAdmin') {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Super Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* User Management */}
        <div style={{ flex: '1 1 300px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Create New Staff</h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Username</label>
              <input type="text" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Password</label>
              <input type="password" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500' }}>Role</label>
              <select style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Manager">Manager</option>
                <option value="Sales">Sales</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Store">Store</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Create Account</button>
          </form>
        </div>

        <div style={{ flex: '2 1 500px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Manage Staff</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Username</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f5f5f5', opacity: u.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{u.username}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{u.role}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ color: u.isActive ? 'var(--primary-green)' : '#ef4444', fontWeight: 'bold' }}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {u.role !== 'SuperAdmin' && (
                        <button onClick={() => toggleUserStatus(u._id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', background: u.isActive ? '#fee2e2' : '#dcfce7', color: u.isActive ? '#ef4444' : '#166534', cursor: 'pointer', fontWeight: '500' }}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
