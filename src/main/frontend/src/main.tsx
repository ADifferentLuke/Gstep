import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import './index.css';
import WorldSetupForm from './WorldSetupForm';

ReactDOMClient.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorldSetupForm />
  </React.StrictMode>
);
