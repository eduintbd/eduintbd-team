import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PurchaseList from './pages/PurchaseList';
import PurchaseForm from './pages/PurchaseForm';
import PurchaseDetail from './pages/PurchaseDetail';
import PaymentList from './pages/PaymentList';
import PaymentForm from './pages/PaymentForm';
import Reports from './pages/Reports';
import Companies from './pages/Companies';
import CompanyForm from './pages/CompanyForm';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import CompanyStatement from './pages/CompanyStatement';
import EmployeeStatement from './pages/EmployeeStatement';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><PurchaseList /></ProtectedRoute>} />
      <Route path="/purchases/new" element={<ProtectedRoute><PurchaseForm /></ProtectedRoute>} />
      <Route path="/purchases/:id" element={<ProtectedRoute><PurchaseDetail /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
      <Route path="/payments/new" element={<ProtectedRoute><PaymentForm /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="/companies/new" element={<ProtectedRoute><CompanyForm /></ProtectedRoute>} />
      <Route path="/companies/:companyId/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
      <Route path="/companies/:companyId/employees/new" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
      <Route path="/statements/company/:id" element={<ProtectedRoute><CompanyStatement /></ProtectedRoute>} />
      <Route path="/statements/employee/:id" element={<ProtectedRoute><EmployeeStatement /></ProtectedRoute>} />
    </Routes>
  );
}
