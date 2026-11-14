import { createContext, useContext, useState } from 'react';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const safe = (fn, d) => { try { return fn(); } catch { return d; } };
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => safe(() => sessionStorage.getItem('token'), null));
  const [email, setEmail] = useState(() => safe(() => sessionStorage.getItem('email'), null));
  const dangNhap = (t, e) => { setToken(t); setEmail(e); safe(() => { sessionStorage.setItem('token', t); sessionStorage.setItem('email', e); }); };
  const dangXuat = () => { setToken(null); setEmail(null); safe(() => { sessionStorage.removeItem('token'); sessionStorage.removeItem('email'); }); };
  return <Ctx.Provider value={{ token, email, dangNhap, dangXuat }}>{children}</Ctx.Provider>;
}
