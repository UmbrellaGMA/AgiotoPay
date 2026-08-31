import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
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

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
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
            <Route path="configuracoes" element={<Settings />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
