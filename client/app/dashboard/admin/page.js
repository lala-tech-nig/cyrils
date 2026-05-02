"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';

export default function AdminDashboard() {
  const { user } = useAppContext();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Sales' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Main' });
  const [productImage, setProductImage] = useState(null);

  const [settings, setSettings] = useState({ targetLat: 0, targetLng: 0 });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', order: 0 });
  const [promoImage, setPromoImage] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchProducts();
    fetchSettings();
    fetchAttendance();
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/promotions/all');
      setPromotions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newPromo.title);
    formData.append('description', newPromo.description);
    formData.append('order', newPromo.order);
    if (promoImage) {
      formData.append('image', promoImage);
    }

    try {
      await api.post('/promotions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewPromo({ title: '', description: '', order: 0 });
      setPromoImage(null);
      fetchPromotions();
      alert('Promotion created successfully');
    } catch (err) {
      alert('Error creating promotion');
    }
  };

  const deletePromo = async (id) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      fetchPromotions();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/attendance/report');
      setAttendanceLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateGeofence = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', { targetLat: settings.targetLat, targetLng: settings.targetLng });
      alert('Geofence updated');
    } catch (err) {
      alert('Error updating geofence');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setNewUser({ username: '', password: '', role: 'Sales' });
      fetchUsers();
      alert('User created successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating user');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('price', newProduct.price);
    formData.append('category', newProduct.category);
    if (productImage) {
      formData.append('image', productImage);
    }

    try {
      await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewProduct({ name: '', price: '', category: 'Main' });
      setProductImage(null);
      fetchProducts();
      alert('Menu item created successfully');
    } catch (err) {
      alert('Error creating product');
    }
  };

  const toggleUserStatus = async (id) => {
    try {
      await api.put(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
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

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '3rem' }}>
        
        {/* Geofence Settings */}
        <div style={{ flex: '1 1 300px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Store Geofence</h2>
          <form onSubmit={updateGeofence} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Target Latitude</label>
              <input type="number" step="any" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={settings.targetLat} onChange={e => setSettings({...settings, targetLat: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Target Longitude</label>
              <input type="number" step="any" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={settings.targetLng} onChange={e => setSettings({...settings, targetLng: e.target.value})} />
            </div>
            <button type="submit" className="btn-secondary">Update Geofence</button>
            <small style={{color: '#666'}}>Staff can only log in within 20m of this location.</small>
          </form>
        </div>

        {/* Staff Attendance Report */}
        <div style={{ flex: '2 1 500px', background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Attendance Report</h2>
          <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Staff</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Check In</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.map(log => (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.user?.username}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{new Date(log.checkIn).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        backgroundColor: log.status === 'Late' ? '#fee2e2' : '#dcfce7',
                        color: log.status === 'Late' ? '#ef4444' : '#16a34a'
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Promotion Management */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Add Hero Promotion</h2>
          <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder="Title" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} />
            <textarea placeholder="Description" style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} />
            <input type="file" accept="image/*" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} onChange={e => setPromoImage(e.target.files[0])} />
            <button type="submit" className="btn-primary">Create Promotion</button>
          </form>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Active Promotions</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {promotions.map(promo => (
              <div key={promo._id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #f5f5f5', paddingBottom: '1rem' }}>
                <img src={promo.imageUrl} alt="" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{promo.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{promo.description}</div>
                </div>
                <button onClick={() => deletePromo(promo._id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
            {promotions.length === 0 && <p>No promotions added.</p>}
          </div>
        </div>
      </div>

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
              <label style={{ fontWeight: '500' }}>Item Image</label>
              <input type="file" accept="image/*" style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} onChange={e => setProductImage(e.target.files[0])} />
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
