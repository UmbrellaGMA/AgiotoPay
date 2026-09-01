import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
