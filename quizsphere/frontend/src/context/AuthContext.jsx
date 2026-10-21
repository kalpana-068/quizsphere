import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('qs_token')) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem('qs_token'))
      .finally(() => setLoading(false));
  }, []);

  const save = (d) => { localStorage.setItem('qs_token', d.token); setUser(d.user); };
  const login = async (email, password) => save((await api.post('/auth/login', { email, password })).data);
  const register = async (body) => save((await api.post('/auth/register', body)).data);
  const logout = () => { localStorage.removeItem('qs_token'); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
