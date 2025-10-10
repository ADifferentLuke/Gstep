
/*
 * (c) 2025 Luke McOmber
 * This code is licensed under MIT license (see LICENSE.txt for details)
 */

import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import './index.css';
import WorldSetupForm from './WorldSetupForm';
import SimulationCanvas from './SimulationCanvas';


const path = window.location.pathname;

const App = () => {
  if (path.startsWith('/canvas')) {
    return <SimulationCanvas />;
  }
  return <WorldSetupForm />;
};

ReactDOMClient.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
