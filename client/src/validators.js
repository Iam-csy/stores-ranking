const rules = {
  name: v => v.length >= 20 && v.length <= 60 ? '' : 'Name must be 20-60 characters',
  storeName: v => v.trim() && v.length <= 60 ? '' : 'Store name is required (max 60 characters)',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email',
  address: v => v.trim() && v.length <= 400 ? '' : 'Address is required (max 400 characters)',
  password: v => /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(v) ? '' : '8-16 characters, one uppercase letter, one special character',
  required: v => v ? '' : 'Required',
};
// map = { field: ruleName } -> { field: message }
export const check = (values, map) => {
  const errs = {};
  for (const [f, r] of Object.entries(map)) { const m = rules[r](values[f] || ''); if (m) errs[f] = m; }
  return errs;
};
