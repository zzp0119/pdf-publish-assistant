import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ViewPDF from './pages/ViewPDF';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/view/:uniqueId" element={<ViewPDF />} />
        <Route path="/" element={<div>请通过链接访问PDF</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
