import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import api from './api.js';
import { useAuth } from './auth.jsx';
import { Form, Filters, Table, useList } from './components.jsx';

const HOME = { admin: '/admin', user: '/stores', owner: '/owner' };
const ROLES = [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'Normal user' }, { value: 'owner', label: 'Store owner' }];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));
const USER_RULES = { name: 'name', email: 'email', address: 'address', password: 'password' };

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} />;
  return <Layout>{children}</Layout>;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header>
        <strong>Store Ratings</strong>
        <nav>
          <Link to={HOME[user.role]}>Home</Link>
          <Link to="/password">Password</Link>
          <button className="link" onClick={logout}>Log out</button>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}

function AuthShell({ title, children, footer }) {
  return <div className="auth"><h1>{title}</h1>{children}<p>{footer}</p></div>;
}

function Login() {
  const { user, login } = useAuth();
  if (user) return <Navigate to={HOME[user.role]} />;
  return (
    <AuthShell title="Log in" footer={<>New here? <Link to="/signup">Create an account</Link></>}>
      <Form label="Log in" rules={{ email: 'email', password: 'required' }}
        fields={[{ name: 'email', label: 'Email' }, { name: 'password', label: 'Password', type: 'password' }]}
        onSubmit={async f => { const { data } = await api.post('/auth/login', f); login(data.token, data.user); }} />
    </AuthShell>
  );
}

function Signup() {
  const nav = useNavigate();
  return (
    <AuthShell title="Create account" footer={<>Have an account? <Link to="/login">Log in</Link></>}>
      <Form label="Sign up" rules={USER_RULES}
        fields={[{ name: 'name', label: 'Full name (20-60 characters)' }, { name: 'email', label: 'Email' },
          { name: 'address', label: 'Address' }, { name: 'password', label: 'Password', type: 'password' }]}
        onSubmit={async f => { await api.post('/auth/signup', f); nav('/login'); }} />
    </AuthShell>
  );
}

function Password() {
  return (
    <section className="narrow"><h2>Change password</h2>
      <Form label="Update password" reset rules={{ currentPassword: 'required', newPassword: 'password' }}
        fields={[{ name: 'currentPassword', label: 'Current password', type: 'password' },
          { name: 'newPassword', label: 'New password', type: 'password' }]}
        onSubmit={f => api.put('/auth/password', f)} />
    </section>
  );
}

/* ---------- Admin ---------- */
function Admin() {
  const [stats, setStats] = useState({});
  const [detail, setDetail] = useState(null);
  const users = useList('/admin/users', { name: '', email: '', address: '', role: '' }, 'name');
  const stores = useList('/admin/stores', { name: '', email: '', address: '' }, 'name');
  const owners = users.rows.filter(u => u.role === 'owner');
  const refresh = () => { api.get('/admin/stats').then(r => setStats(r.data)); users.reload(); stores.reload(); };
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)); }, []);

  return (
    <>
      <section className="stats">
        {[['Users', stats.users], ['Stores', stats.stores], ['Ratings', stats.ratings]].map(([l, n]) =>
          <div key={l}><b>{n ?? '–'}</b><span>{l}</span></div>)}
      </section>

      <section><h2>Users</h2>
        <Filters list={users} roles={ROLES} />
        <Table list={users} onRow={r => api.get(`/admin/users/${r.id}`).then(x => setDetail(x.data))}
          cols={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' },
            { key: 'role', label: 'Role', render: r => ROLE_LABEL[r.role] }]} />
        {detail && (
          <aside className="detail">
            <button className="link" onClick={() => setDetail(null)}>Close</button>
            <h3>{detail.name}</h3>
            <p>{detail.email}</p><p>{detail.address}</p><p>{ROLE_LABEL[detail.role]}</p>
            {detail.role === 'owner' && <p>Store rating: <b>{detail.rating ?? 'No ratings yet'}</b></p>}
          </aside>)}
      </section>

      <section><h2>Stores</h2>
        <Filters list={stores} />
        <Table list={stores}
          cols={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' },
            { key: 'rating', label: 'Rating' }]} />
      </section>

      <div className="split">
        <section><h2>Add user</h2>
          <Form label="Add user" reset rules={{ ...USER_RULES, role: 'required' }}
            fields={[{ name: 'name', label: 'Name (20-60 characters)' }, { name: 'email', label: 'Email' },
              { name: 'address', label: 'Address' }, { name: 'password', label: 'Password', type: 'password' },
              { name: 'role', label: 'Role', options: ROLES }]}
            onSubmit={async f => { await api.post('/admin/users', f); refresh(); }} />
        </section>
        <section><h2>Add store</h2>
          <Form label="Add store" reset rules={{ name: 'storeName', email: 'email', address: 'address' }}
            fields={[{ name: 'name', label: 'Store name' }, { name: 'email', label: 'Store email' }, { name: 'address', label: 'Address' },
              { name: 'ownerId', label: 'Owner (optional)', placeholder: 'No owner', options: owners.map(o => ({ value: o.id, label: o.name })) }]}
            onSubmit={async f => { await api.post('/admin/stores', f); refresh(); }} />
        </section>
      </div>
    </>
  );
}

/* ---------- Normal user ---------- */
function Stores() {
  const list = useList('/user/stores', { q: '' }, 'name');
  const rate = async (id, rating) => { await api.put(`/user/stores/${id}/rating`, { rating }); list.reload(); };
  return (
    <section><h2>Stores</h2>
      <div className="filters">
        <input placeholder="Search by name or address" value={list.filters.q} onChange={e => list.setFilters({ q: e.target.value })} />
      </div>
      <Table list={list} empty="No stores match your search."
        cols={[{ key: 'name', label: 'Store' }, { key: 'address', label: 'Address' },
          { key: 'overall', label: 'Overall rating' }, { key: 'myRating', label: 'Your rating' },
          { key: 'act', label: 'Rate', sortable: false, render: r => (
            <select value={r.myRating || ''} onChange={e => rate(r.id, e.target.value)}>
              <option value="" disabled>{r.myRating ? 'Change' : 'Rate'}</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>) }]} />
    </section>
  );
}

/* ---------- Store owner ---------- */
function Owner() {
  const [data, setData] = useState({ store: null, raters: [] });
  const [s, setS] = useState({ sort: 'name', order: 'asc' });
  const list = { rows: data.raters, s, toggle: k => setS(p => ({ sort: k, order: p.sort === k && p.order === 'asc' ? 'desc' : 'asc' })) };
  const load = (q) => api.get('/owner/dashboard', { params: q }).then(r => setData(r.data));
  useEffect(() => { load(s); }, [s]);
  if (!data.store) return <section><h2>Dashboard</h2><p>No store is assigned to your account yet. Ask an administrator.</p></section>;
  return (
    <>
      <section className="stats">
        <div><b>{data.store.average ?? '–'}</b><span>Average rating</span></div>
        <div><b>{data.store.total}</b><span>Ratings received</span></div>
      </section>
      <section><h2>{data.store.name}: who rated it</h2>
        <Table list={list} empty="No ratings yet."
          cols={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'rating', label: 'Rating' },
            { key: 'date', label: 'Updated', render: r => new Date(r.date).toLocaleDateString() }]} />
      </section>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
      <Route path="/stores" element={<Guard roles={['user']}><Stores /></Guard>} />
      <Route path="/owner" element={<Guard roles={['owner']}><Owner /></Guard>} />
      <Route path="/password" element={<Guard><Password /></Guard>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
