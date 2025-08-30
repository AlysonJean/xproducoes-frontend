import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

import './styles/themes/theme-variables.css';
import './index.css';
import './styles/tailwind.css';
import './styles/headingReveal';
import 'react-big-calendar/lib/css/react-big-calendar.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
        <ErrorBoundary>
         <App />
       </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
