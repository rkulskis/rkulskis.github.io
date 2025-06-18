import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Determine base path for router based on current URL
const currentPath = window.location.pathname;
const baseName = currentPath.startsWith('/philsaxioms/') ? '/philsaxioms' : 
                  (currentPath === '/philsaxioms' ? '/philsaxioms' : undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={baseName}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);