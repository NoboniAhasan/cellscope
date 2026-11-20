import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Badge } from './Badge';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:opacity-95 transition">
              CS
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 leading-none">CellScope</span>
              <span className="text-[10px] text-slate-500 tracking-wider font-medium uppercase mt-0.5">
                Microscopy Research
              </span>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              {user.role === 'researcher' ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 rounded-md transition"
                  >
                    Experiments
                  </Link>
                  <Link
                    to="/comparison"
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 rounded-md transition"
                  >
                    Comparison
                  </Link>
                </>
              ) : (
                <Link
                  to="/reviews"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 rounded-md transition"
                >
                  Assigned Reviews
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-medium text-slate-800">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <Badge variant={user.role === 'researcher' ? 'researcher' : 'reviewer'}>
                {user.role}
              </Badge>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-300 hover:border-red-200 rounded-md transition"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-sm transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
