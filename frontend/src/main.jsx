import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import './index.css';
import './hooks/useTheme'; // applies saved theme before first paint
import App from './App.jsx';
import { store } from './store/store.js';
import { ToastProvider } from './components/Toast';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
