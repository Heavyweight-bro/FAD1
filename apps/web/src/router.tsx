import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './ui/AppLayout';
import { DashboardPage } from './views/DashboardPage';
import { SuppliersPage } from './views/SuppliersPage';
import { TemplatesPage } from './views/TemplatesPage';
import { InvoicesPage } from './views/InvoicesPage';
import { SettingsPage } from './views/SettingsPage';
import { LoginPage } from './views/LoginPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'suppliers', element: <SuppliersPage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

