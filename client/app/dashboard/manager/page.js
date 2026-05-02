"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import api from '../../../lib/api';

export default function ManagerDashboard() {
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState({
    totalSales: 0, monthSales: 0, ordersCount: 0, monthOrdersCount: 0, 
    cashReceived: 0, transferReceived: 0, staffCount: 0, users: [], todayOrders: []
  });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Main' });
  const [productImage, setProductImage] = useState(null);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', order: 0 });
  const [promoImage, setPromoImage] = useState(null);
  const [settings, setSettings] = useState({ isMarketOpen: true, interventionPassword: '1234' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, attRes, promoRes, prodRes, transRes] = await Promise.all([
        api.get('/stats'),
        api.get('/attendance/report'),
        api.get('/promotions/all'),
        api.get('/products'),
        api.get('/transfers'),
        api.get('/settings')
      ]);
      setStats(statsRes.data);
      setAttendanceLogs(attRes.data);
      setPromotions(promoRes.data);
      setProducts(prodRes.data);
      setTransfers(transRes.data);
      setSettings(settRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newPromo.title);
    formData.append('description', newPromo.description);
    formData.append('order', newPromo.order);
    if (promoImage) formData.append('image', promoImage);

    try {
      await api.post('/promotions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewPromo({ title: '', description: '', order: 0 });
      setPromoImage(null);
      fetchData();
      alert('Promotion created successfully');
    } catch (err) { 
      alert(err.response?.data?.message || 'Error creating promotion'); 
    }
  };

  const deletePromo = async (id) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('price', newProduct.price);
    formData.append('category', newProduct.category);
    if (productImage) formData.append('image', productImage);

    try {
      await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewProduct({ name: '', price: '', category: 'Main' });
      setProductImage(null);
      fetchData();
      alert('Menu item created successfully');
    } catch (err) { 
      alert(err.response?.data?.message || 'Error creating product'); 
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (!user || (user.role !== 'Manager' && user.role !== 'SuperAdmin')) {
    return <div style={{ padding: '2rem' }}>Unauthorized Access</div>;
  }

  const tabs = ['Overview', 'Detailed Sales', 'Staff & Performance', 'Kitchen & Transfers', 'Promotions', 'Menu', 'Settings'];

  const loggedInUsers = attendanceLogs.filter(log => !log.checkOut && new Date(log.date).toDateString() === new Date().toDateString());

  return (
    <div style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--text-dark)' }}>Detailed Reports Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user.username}</p>
        </div>
        <button className="btn-secondary" onClick={fetchData}>🔄 Refresh Data</button>
      </header>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === tab ? 'var(--primary-orange)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-muted)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Today's Sales</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-orange)' }}>₦{stats.totalSales?.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{stats.ordersCount} orders</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This Month's Sales</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-green)' }}>₦{stats.monthSales?.toLocaleString()}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{stats.monthOrdersCount} orders</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active Staff On-site</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6' }}>{loggedInUsers.length}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Out of {stats.staffCount} staff</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Payment Mix (Today)</div>
              <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Cash: <span style={{ fontWeight: 'bold' }}>₦{stats.cashReceived?.toLocaleString()}</span><br/>
                Other: <span style={{ fontWeight: 'bold' }}>₦{stats.transferReceived?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Currently Logged In</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: '0.5rem' }}>Staff</th>
                    <th style={{ padding: '0.5rem' }}>Dept</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loggedInUsers.map(log => (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{log.user?.username}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{log.user?.role}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#16a34a', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold' }}>ONLINE</span>
                      </td>
                    </tr>
                  ))}
                  {loggedInUsers.length === 0 && <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No staff currently logged in.</td></tr>}
                </tbody>
              </table>
            </div>
            
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Performance Summary</h2>
              {Object.entries(stats.salesPerStaff || {}).map(([staff, amount]) => (
                <div key={staff} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f9f9f9' }}>
                  <span>{staff}</span>
                  <span style={{ fontWeight: 'bold' }}>₦{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Sales Tab */}
      {activeTab === 'Detailed Sales' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Detailed Sales Record (Today)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#666', fontSize: '0.9rem' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Time</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Order ID</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Staff</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Items</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Total</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.todayOrders?.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(order.createdAt).toLocaleTimeString()}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>#{order._id.slice(-6)}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{order.salesPersonName}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{order.items?.length} items</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>₦{order.totalAmount.toLocaleString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.75rem' }}>{order.paymentMethod}</span>
                      </td>
                    </tr>
                  ))}
                  {stats.todayOrders?.length === 0 && <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No orders found for today.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff & Performance Tab */}
      {activeTab === 'Staff & Performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Staff Directory & Roles</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Role/Department</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Date Joined</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users?.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{u.username}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{u.role}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}><span style={{ color: '#16a34a' }}>● Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Attendance History</h2>
            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Staff</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Check In</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Check Out</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.map(log => (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(log.date).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{log.user?.username}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(log.checkIn).toLocaleTimeString()}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : 'N/A'}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                          backgroundColor: log.status === 'Late' ? '#fee2e2' : '#dcfce7',
                          color: log.status === 'Late' ? '#ef4444' : '#16a34a'
                        }}>{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen & Transfers Tab */}
      {activeTab === 'Kitchen & Transfers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Stock Transfers (Kitchen to Sales)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Product</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Handled By</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>{new Date(t.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{t.product?.name}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{t.quantity}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{t.handledBy?.username}</td>
                    </tr>
                  ))}
                  {transfers.length === 0 && <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No stock transfers recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Promotions Tab */}
      {activeTab === 'Promotions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Add Hero Promotion</h2>
            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Title" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newPromo.title} onChange={e => setNewPromo({...newPromo, title: e.target.value})} />
              <textarea placeholder="Description" style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} />
              <input type="file" accept="image/*" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} onChange={e => setPromoImage(e.target.files[0])} />
              <button type="submit" className="btn-primary">Create Promotion</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Active Promotions</h2>
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
            </div>
          </div>
        </div>
      )}

      {/* Menu Tab */}
      {activeTab === 'Menu' && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ flex: '1 1 300px' }} className="glass-panel">
            <h2 style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid #eee' }}>Create Menu Item</h2>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1.5rem 1.5rem' }}>
              <input type="text" placeholder="Item Name" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input type="number" placeholder="Price (₦)" required style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <select style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="Main">Main</option>
                <option value="Swallow">Swallow</option>
                <option value="Proteins">Proteins</option>
                <option value="Drinks">Drinks</option>
                <option value="Sides">Sides</option>
              </select>
              <input type="file" accept="image/*" style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} onChange={e => setProductImage(e.target.files[0])} />
              <button type="submit" className="btn-primary">Add to Menu</button>
            </form>
          </div>

          <div style={{ flex: '2 1 500px' }} className="glass-panel">
            <h2 style={{ marginBottom: '1.5rem', padding: '1.5rem', borderBottom: '1px solid #eee' }}>Current Menu</h2>
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '0.75rem' }}>Name</th>
                    <th style={{ padding: '0.75rem' }}>Price</th>
                    <th style={{ padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '0.75rem' }}>{p.name}</td>
                      <td style={{ padding: '0.75rem' }}>₦{p.price}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <button onClick={() => deleteProduct(p._id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Settings Tab */}
      {activeTab === 'Settings' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Store Operations Control</h2>
            
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: settings.isMarketOpen ? '#dcfce7' : '#fee2e2', borderRadius: '12px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Market Status: {settings.isMarketOpen ? 'OPEN' : 'CLOSED'}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {settings.isMarketOpen 
                    ? 'Customers can place orders online.' 
                    : 'Ordering is disabled. Customers will see a "Closed" message.'}
                </div>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const newStatus = !settings.isMarketOpen;
                    await api.put('/settings', { isMarketOpen: newStatus });
                    setSettings({ ...settings, isMarketOpen: newStatus });
                    alert(`Market is now ${newStatus ? 'Open' : 'Closed'}`);
                  } catch (err) {
                    alert('Failed to update market status');
                  }
                }}
                className={settings.isMarketOpen ? 'btn-secondary' : 'btn-primary'}
                style={{ background: settings.isMarketOpen ? '#ef4444' : '#16a34a', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {settings.isMarketOpen ? 'Close Market' : 'Open Market'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Security Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: '#666' }}>Intervention Password</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    value={settings.interventionPassword} 
                    onChange={(e) => setSettings({...settings, interventionPassword: e.target.value})}
                    style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px' }}
                  />
                  <button 
                    onClick={async () => {
                      try {
                        await api.put('/settings', { interventionPassword: settings.interventionPassword });
                        alert('Intervention password updated');
                      } catch (err) {
                        alert('Failed to update password');
                      }
                    }}
                    className="btn-primary"
                  >
                    Save
                  </button>
                </div>
                <small style={{ color: '#999' }}>This password is required to perform sensitive actions on the Sales Dashboard.</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
