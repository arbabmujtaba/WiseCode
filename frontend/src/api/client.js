import axios from 'axios';
import { API_BASE_URL } from './baseUrl';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extracts a human-readable message from an axios error or API response.
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (!error) return fallback;
  if (!error.response) {
    return error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : error.message || fallback;
  }
  const data = error.response.data;
  if (typeof data === 'string' && data.trim()) return data.replace(/^Error:\s*/, '');
  return data?.message || data?.error || fallback;
};

export default axiosClient;
