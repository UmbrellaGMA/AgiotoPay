import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Login';
import Receipt from './pages/Receipt';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Installments from './pages/Installments';
import Payments from './pages/Payments';
import MoneyOnStreet from './pages/MoneyOnStreet';
import Agenda from './pages/Agenda';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recibo/:id" element={<Receipt />} />
          <Route path="/recibos/:id" element={<Receipt />} />
          
          {/* Common Aliases */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/cliente" element={<Navigate to="/clientes" replace />} />
          <Route path="/emprestimo" element={<Navigate to="/emprestimos" replace />} />
          <Route path="/parcela" element={<Navigate to="/parcelas" replace />} />
          <Route path="/pagamento" element={<Navigate to="/pagamentos" replace />} />
          <Route path="/relatorio" element={<Navigate to="/relatorios" replace />} />
          <Route path="/notificacao" element={<Navigate to="/notificacoes" replace />} />
          <Route path="/usuario" element={<Navigate to="/usuarios" replace />} />
          <Route path="/config" element={<Navigate to="/configuracoes" replace />} />
          <Route path="/configuracao" element={<Navigate to="/configuracoes" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dinheiro-na-rua" element={<MoneyOnStreet />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="clientes/:id" element={<ClientProfile />} />
              <Route path="emprestimos" element={<Loans />} />
              <Route path="emprestimos/:id" element={<LoanDetail />} />
              <Route path="parcelas" element={<Installments />} />
              <Route path="pagamentos" element={<Payments />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="notificacoes" element={<Notifications />} />
              <Route path="usuarios" element={<UserManagement />} />
              <Route path="configuracoes" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
