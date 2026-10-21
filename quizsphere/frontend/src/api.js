import axios from 'axios';

// Same-origin '/api' works in development (Vite proxy) and when the backend serves the build.
// For a separate frontend host (e.g. Vercel) set VITE_API_URL=https://your-backend.onrender.com/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('qs_token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export default api;
