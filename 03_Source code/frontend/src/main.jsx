import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/tokens.css';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AppLayout from './layout/AppLayout.jsx';
import NhaTroPage from './pages/NhaTroPage.jsx';
import PhongTroPage from './pages/PhongTroPage.jsx';
import DichVuPage from './pages/DichVuPage.jsx';
import NguoiThuePage from './pages/NguoiThuePage.jsx';
import MauHopDongPage from './pages/MauHopDongPage.jsx';
import HopDongPage from './pages/HopDongPage.jsx';
import TaiChinhPage from './pages/TaiChinhPage.jsx';
import BaoCaoPage from './pages/BaoCaoPage.jsx';
import './styles/app.css';

function Private({ children }) { return useAuth().token ? children : <Navigate to="/dang-nhap" replace />; }
createRoot(document.getElementById('root')).render(
  <AuthProvider><BrowserRouter><Routes>
    <Route path="/dang-nhap" element={<LoginPage />} />
    <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
    <Route element={<Private><AppLayout /></Private>}>
      <Route path="/nha-tro" element={<NhaTroPage />} />
      <Route path="/phong-tro" element={<PhongTroPage />} />
      <Route path="/dich-vu" element={<DichVuPage />} />
      <Route path="/nguoi-thue" element={<NguoiThuePage />} />
      <Route path="/mau-hop-dong" element={<MauHopDongPage />} />
      <Route path="/hop-dong" element={<HopDongPage />} />
      <Route path="/tai-chinh" element={<TaiChinhPage />} />
      <Route path="/bao-cao" element={<BaoCaoPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
  </Routes></BrowserRouter></AuthProvider>
);
