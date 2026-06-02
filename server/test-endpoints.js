async function test() {
  console.log('Logging in as manager...');
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@cyrils.com',
        password: 'password123'
      })
    });

    if (!loginRes.ok) {
      const errBody = await loginRes.json();
      console.error('Login response was not OK:', errBody);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful! Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    const endpoints = [
      { name: '/stats', url: 'http://localhost:5000/api/stats' },
      { name: '/attendance/report', url: 'http://localhost:5000/api/attendance/report' },
      { name: '/promotions/all', url: 'http://localhost:5000/api/promotions/all' },
      { name: '/products', url: 'http://localhost:5000/api/products' },
      { name: '/settings', url: 'http://localhost:5000/api/settings' },
      { name: '/orders/pr', url: 'http://localhost:5000/api/orders/pr' }
    ];

    for (const ep of endpoints) {
      console.log(`Testing endpoint ${ep.name}...`);
      try {
        const res = await fetch(ep.url, { headers });
        if (res.ok) {
          const data = await res.json();
          console.log(`✅ ${ep.name}: SUCCESS (${res.status}) - Data count/size:`, Array.isArray(data) ? data.length : typeof data);
        } else {
          console.error(`❌ ${ep.name}: FAILED`);
          console.error(`   Status: ${res.status}`);
          try {
            const errData = await res.json();
            console.error('   Body:', errData);
          } catch {
            const errText = await res.text();
            console.error('   Body (text):', errText.slice(0, 500));
          }
        }
      } catch (err) {
        console.error(`❌ ${ep.name}: FAILED with error:`, err.message);
      }
    }
  } catch (err) {
    console.error('Login failed:', err.message);
  }
}

test();
