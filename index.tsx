
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("🚀 Index.tsx is running!");

const rootElement = document.getElementById('root');
console.log("Root element:", rootElement);

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
