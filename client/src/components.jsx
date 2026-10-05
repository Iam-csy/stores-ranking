import { useEffect, useState } from 'react';
import api from './api.js';
import { check } from './validators.js';

export function Form({ fields, rules, onSubmit, label, reset }) {
  const [f, setF] = useState({});
  const [err, setErr] = useState({});
  const [msg, setMsg] = useState(null);
  const submit = async e => {
    e.preventDefault();
    const v = check(f, rules);
    setErr(v); setMsg(null);
    if (Object.keys(v).length) return;
    try { await onSubmit(f); setMsg({ ok: true, text: 'Saved' }); if (reset) setF({}); }
    catch (x) { setMsg({ text: x.response?.data?.message || 'Something went wrong' }); }
  };
  return (
    <form onSubmit={submit} noValidate>
      {fields.map(x => (
        <label key={x.name}>{x.label}
          {x.options
            ? <select value={f[x.name] || ''} onChange={e => setF({ ...f, [x.name]: e.target.value })}>
                <option value="">{x.placeholder || 'Select'}</option>
                {x.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : <input type={x.type || 'text'} value={f[x.name] || ''} onChange={e => setF({ ...f, [x.name]: e.target.value })} />}
          {err[x.name] && <small className="err">{err[x.name]}</small>}
        </label>
      ))}
      <button>{label}</button>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
    </form>
  );
}

export function useList(url, initial, defSort) {
  const [filters, setFilters] = useState(initial);
  const [s, setS] = useState({ sort: defSort, order: 'asc' });
  const [rows, setRows] = useState([]);
  const [v, setV] = useState(0);
  const toggle = k => setS(p => ({ sort: k, order: p.sort === k && p.order === 'asc' ? 'desc' : 'asc' }));
  useEffect(() => {
    const t = setTimeout(() => api.get(url, { params: { ...filters, ...s } }).then(r => setRows(r.data)), 250);
    return () => clearTimeout(t);
  }, [url, filters, s, v]);
  return { rows, filters, setFilters, s, toggle, reload: () => setV(x => x + 1) };
}

export function Filters({ list, roles }) {
  return (
    <div className="filters">
      {Object.keys(list.filters).map(k => k === 'role'
        ? <select key={k} value={list.filters[k]} onChange={e => list.setFilters({ ...list.filters, role: e.target.value })}>
            <option value="">All roles</option>
            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        : <input key={k} placeholder={`Filter by ${k}`} value={list.filters[k]}
            onChange={e => list.setFilters({ ...list.filters, [k]: e.target.value })} />)}
    </div>
  );
}

export function Table({ cols, list, onRow, empty = 'Nothing matches yet.' }) {
  return (
    <div className="scroll">
      <table>
        <thead><tr>{cols.map(c => (
          <th key={c.key} onClick={() => c.sortable !== false && list.toggle(c.key)} className={c.sortable === false ? '' : 'sortable'}>
            {c.label}{list.s.sort === c.key ? (list.s.order === 'asc' ? ' ▲' : ' ▼') : ''}
          </th>))}
        </tr></thead>
        <tbody>
          {list.rows.map(r => (
            <tr key={r.id} onClick={() => onRow?.(r)} className={onRow ? 'click' : ''}>
              {cols.map(c => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? '–')}</td>)}
            </tr>))}
          {!list.rows.length && <tr><td colSpan={cols.length}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
