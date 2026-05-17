"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';
import styles from '../manager/manager.module.css';

export default function AdminDashboard() {
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState('User Management');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Sales' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Main', taxPercent: 0, discountPercent: 0, discountExpiry: '' });
  const [productImage, setProductImage] = useState(null);

  const [settings, setSettings] = useState({ targetLat: 0, targetLng: 0 });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', order: 0 });
  const [promoImage, setPromoImage] = useState(null);

  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchProducts();
    fetchSettings();
    fetchAttendance();
    fetchPromotions();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities?limit=500');
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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
    formData.append('taxPercent', newProduct.taxPercent);
    formData.append('discountPercent', newProduct.discountPercent);
    if (newProduct.discountExpiry) {
      formData.append('discountExpiry', newProduct.discountExpiry);
    }
    if (productImage) {
      formData.append('image', productImage);
    }

    try {
      await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewProduct({ name: '', price: '', category: 'Main', taxPercent: 0, discountPercent: 0, discountExpiry: '' });
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

  const endShift = async (id) => {
    if (!confirm('End shift for this user and lock account for 8 hours?')) return;
    try {
      await api.post(`/users/${id}/end-shift`);
      fetchUsers();
      alert('Shift ended successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to end shift.');
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
    <div className={styles.managerWrapper}>
      <nav className={styles.topNav}>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'User Management' ? styles.active : ''}`} onClick={() => setActiveTab('User Management')}>
            User Management
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Settings' ? styles.active : ''}`} onClick={() => setActiveTab('Settings')}>
            Settings
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Promotions' ? styles.active : ''}`} onClick={() => setActiveTab('Promotions')}>
            Promotions
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'System Activity Logs' ? styles.active : ''}`} onClick={() => setActiveTab('System Activity Logs')}>
            System Activity Logs
          </button>
        </div>
        <div className={styles.navGroup}>
          <button className={`${styles.navBtn} ${activeTab === 'VFD Promotions' ? styles.active : ''}`} onClick={() => setActiveTab('VFD Promotions')}>
            <span className={styles.icon}>📺</span> VFD Promotions
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'Menu Catalog' ? styles.active : ''}`} onClick={() => setActiveTab('Menu Catalog')}>
            <span className={styles.icon}>🍔</span> Menu Catalog
          </button>
        </div>
      </nav>

      <main className={styles.mainContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{activeTab}</h1>
            <p className={styles.pageSubtitle}>Super Admin Control Panel</p>
          </div>
        </header>

        {activeTab === 'Geofence Settings' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Geofence Settings */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Store Geofence</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={updateGeofence} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Target Latitude</label>
                    <input type="number" step="any" className={styles.formControl} required value={settings.targetLat} onChange={e => setSettings({...settings, targetLat: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Target Longitude</label>
                    <input type="number" step="any" className={styles.formControl} required value={settings.targetLng} onChange={e => setSettings({...settings, targetLng: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary}>Update Geofence</button>
                    <small style={{color: '#666', marginTop: '0.5rem'}}>Staff can only log in within 20m of this location.</small>
                  </div>
                </form>
              </div>
            </div>

            {/* Staff Attendance Report */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Attendance Report</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Check In</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.map(log => (
                      <tr key={log._id}>
                        <td style={{ fontWeight: 600 }}>{log.user?.username}</td>
                        <td>{new Date(log.checkIn).toLocaleString()}</td>
                        <td>
                          <span className={`${styles.badge} ${log.status === 'Late' ? styles.badgeRed : styles.badgeGreen}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendanceLogs.length === 0 && <tr><td colSpan="3" className={styles.emptyState}>No attendance records.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'VFD Promotions' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Add Hero Promotion</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreatePromo} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Title</label>
                    <input type="text" className={styles.formControl} required value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Order</label>
                    <input type="number" className={styles.formControl} value={newPromo.order} onChange={e => setNewPromo({...newPromo, order: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Description</label>
                    <textarea className={styles.formControl} value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} rows={2} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Image</label>
                    <input type="file" accept="image/*" className={styles.formControl} required onChange={e => setPromoImage(e.target.files[0])} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary}>Create Promotion</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Active Promotions</h2>
              </div>
              <div className={styles.panelBody} style={{ padding: '1rem' }}>
                <div className={styles.promoGrid}>
                  {promotions.map(promo => (
                    <div key={promo._id} className={styles.promoCard}>
                      <img src={promo.imageUrl} alt="" className={styles.promoMedia} />
                      <div className={styles.promoCardBody}>
                        <div className={styles.promoCardTitle}>{promo.title}</div>
                        <div className={styles.promoCardDesc}>{promo.description}</div>
                        <div className={styles.promoCardActions}>
                          <button className={styles.btnGhost} onClick={() => deletePromo(promo._id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {promotions.length === 0 && <div className={styles.emptyState}>No promotions added.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'User Management' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Create New Staff</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateUser} className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Username</label>
                    <input type="text" className={styles.formControl} required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Password</label>
                    <input type="password" className={styles.formControl} required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Role</label>
                    <select className={styles.formControl} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="SuperAdmin">SuperAdmin</option>
                      <option value="Manager">Manager</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Store">Store</option>
                      <option value="Order">Order</option>
                    </select>
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary}>Create Account</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Manage Staff</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{u.role}</span></td>
                        <td>
                          <span className={`${styles.badge} ${u.isActive ? styles.badgeGreen : styles.badgeRed}`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          {u.role !== 'SuperAdmin' && (
                            <button onClick={() => toggleUserStatus(u._id)} className={u.isActive ? styles.btnDanger : styles.btnSuccess} style={{ marginRight: '0.5rem' }}>
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                          {u.role === 'Sales' && (
                            <button onClick={() => endShift(u._id)} className={styles.btnDanger} style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
                              End Shift
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Menu Catalog' && (
          <div className={styles.twoCol} style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Create Menu Item</h2>
              </div>
              <div className={styles.panelBody}>
                <form onSubmit={handleCreateProduct} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Item Name</label>
                    <input type="text" className={styles.formControl} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Price (₦)</label>
                    <input type="number" className={styles.formControl} required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Category</label>
                    <select className={styles.formControl} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                      <option value="Main">Main</option>
                      <option value="Swallow">Swallow</option>
                      <option value="Proteins">Proteins</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Sides">Sides</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tax (%)</label>
                    <input type="number" className={styles.formControl} value={newProduct.taxPercent} onChange={e => setNewProduct({...newProduct, taxPercent: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Discount (%)</label>
                    <input type="number" className={styles.formControl} value={newProduct.discountPercent} onChange={e => setNewProduct({...newProduct, discountPercent: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Discount Expiry</label>
                    <input type="datetime-local" className={styles.formControl} value={newProduct.discountExpiry} onChange={e => setNewProduct({...newProduct, discountExpiry: e.target.value})} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <label className={styles.formLabel}>Item Image</label>
                    <input type="file" accept="image/*" className={styles.formControl} onChange={e => setProductImage(e.target.files[0])} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.full}`}>
                    <button type="submit" className={styles.btnPrimary}>Add to Menu</button>
                  </div>
                </form>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Current Menu</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p._id}>
                        <td>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '6px' }}></div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{p.category}</span></td>
                        <td style={{ fontWeight: 800 }}>₦{p.price}</td>
                        <td>
                          <button className={styles.btnGhost} onClick={() => deleteProduct(p._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && <tr><td colSpan="5" className={styles.emptyState}>No menu items found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM ACTIVITY LOGS TAB */}
        {activeTab === 'System Activity Logs' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Global System Activity Logs</h2>
                <button className={styles.btnSecondary} onClick={fetchActivities}>🔄 Refresh Logs</button>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table} style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Action</th>
                      <th>Endpoint</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map(log => (
                      <tr key={log._id}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{log.username}</td>
                        <td><span className={`${styles.badge} ${styles.badgeGray}`}>{log.role}</span></td>
                        <td>
                          <span className={styles.badge} style={{ 
                            background: log.action === 'POST' ? '#dcfce3' : log.action === 'DELETE' ? '#fee2e2' : '#fef3c7',
                            color: log.action === 'POST' ? '#166534' : log.action === 'DELETE' ? '#991b1b' : '#92400e'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.endpoint}</td>
                        <td style={{ color: log.status >= 400 ? '#ef4444' : '#10b981' }}>{log.status}</td>
                        <td>
                          <details>
                            <summary>View Data</summary>
                            <pre style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', maxHeight: '150px' }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                    {activities.length === 0 && <tr><td colSpan="7" className={styles.emptyState}>No activities logged yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
