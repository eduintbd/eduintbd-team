import { Link, useLocation, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '@bhai-store/shared';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/purchases', label: 'Purchases', icon: '🛒' },
  { path: '/payments', label: 'Payments', icon: '💰' },
  { path: '/companies', label: 'Corporate', icon: '🏢' },
  { path: '/reports', label: 'Reports', icon: '📈' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-800 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <h1 className="text-xl font-bold">{STORE_NAME}</h1>
          <p className="text-primary-300 text-sm mt-1">Expense Tracker</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-primary-200 hover:text-white hover:bg-primary-700 rounded-lg transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
