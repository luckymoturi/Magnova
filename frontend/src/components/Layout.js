import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout = ({ children, pageTitle, pageDescription }) => {
  return (
    <div className="App min-h-screen bg-neutral-50/30">
      <Sidebar />
      <div className="main-content">
        <Header pageTitle={pageTitle} pageDescription={pageDescription} />
        <div className="px-4 py-4 md:px-6 md:py-5 bg-neutral-50/30 min-h-screen">{children}</div>
      </div>
    </div>
  );
};
