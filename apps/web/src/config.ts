// API configuration
// In development, Vite proxies /api to localhost:8787
// In production, set VITE_API_URL to your worker URL

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
