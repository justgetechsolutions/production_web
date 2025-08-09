import { AuthProvider, useAuth } from './AuthContext.tsx';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layout/MainLayout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Menu from './pages/Menu.tsx';
import Tables from './pages/Tables.tsx';
import Staff from './pages/Staff.tsx';
import Orders from './pages/Orders.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import KitchenLogin from './pages/KitchenLogin.tsx';
import KitchenDashboard from './pages/KitchenDashboard.tsx';
import MenuPage from './pages/OrderPage.tsx'; // Rename for clarity
import OrderStatusPage from './pages/OrderStatusPage.tsx';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminMenu from './pages/AdminMenu.tsx'; 
import AdminCategories from './pages/AdminCategories.tsx';
import AdminLayout from './layout/AdminLayout.tsx';
import AdminFeedback from './pages/AdminFeedback.tsx';
import CalendarView from './pages/CalendarView.tsx';
import Calendar from './pages/Calendar.tsx';
import MakeOrder from './pages/MakeOrder.tsx';

function PrivateRoute({ children }: { children: any }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: any }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function KitchenRoute({ children }: { children: any }) {
  const staffData = document.cookie.includes('kitchenStaff') ? decodeURIComponent((document.cookie.split('; ').find(row => row.startsWith('kitchenStaff=')) || '').split('=')[1] || '') : '';
  const location = useLocation();
  
  if (!staffData) {
    return <Navigate to="/kitchen-login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/admin/tables" replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/kitchen-login" element={<KitchenLogin />} />
      <Route path="/kitchen-dashboard" element={<KitchenRoute><KitchenDashboard /></KitchenRoute>} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/r/:restaurantId/menu/:tableNumber" element={<MenuPage />} />
      <Route path="/order-status" element={<OrderStatusPage />} />
      <Route path="/admin/:restaurantId/*" element={<ProtectedRoute><AdminLayout><Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="menu" element={<Menu />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="tables" element={<Tables />} />
        <Route path="staff" element={<Staff />} />
        <Route path="order" element={<Orders />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="make-order" element={<MakeOrder />} />
        <Route path="feedback" element={<AdminFeedback />} />
        <Route path="*" element={<Navigate to="tables" replace />} />
      </Routes></AdminLayout></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover aria-label="Notification" />
      </Router>
    </AuthProvider>
  );
}

export default App;
