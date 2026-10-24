import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutDashboard, ListChecks, LogOut, Menu, Moon, Shield, Sun, User } from 'lucide-react';
import { logoutUser } from '../authSlice';
import { useTheme } from '../hooks/useTheme';
import { clearProblemCache } from '../hooks/useProblems';
import { useToast } from './Toast';
import { Logo } from './ui';
import Dropdown from './Dropdown';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      className="btn btn-ghost btn-sm btn-circle"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function UserMenu() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await dispatch(logoutUser());
    clearProblemCache();
    toast.info('Signed out');
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <Dropdown
      label="Account menu"
      trigger={
        <>
          <div className="avatar avatar-placeholder">
            <div className="w-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content">
              <span className="text-xs font-semibold">{initials}</span>
            </div>
          </div>
          <span className="hidden max-w-28 truncate sm:inline">{user?.firstName}</span>
        </>
      }
    >
      <li className="menu-title">
        <span className="truncate normal-case">{user?.emailId}</span>
        {user?.role === 'admin' && <span className="badge badge-primary badge-xs mt-1">admin</span>}
      </li>
      <li>
        <NavLink to="/dashboard">
          <User size={16} /> Profile & stats
        </NavLink>
      </li>
      {user?.role === 'admin' && (
        <li>
          <NavLink to="/admin">
            <Shield size={16} /> Admin console
          </NavLink>
        </li>
      )}
      <li>
        <button onClick={logout} disabled={busy}>
          <LogOut size={16} /> Sign out
        </button>
      </li>
    </Dropdown>
  );
}

const navCls = ({ isActive }) =>
  `btn btn-sm btn-ghost gap-2 font-medium ${isActive ? 'bg-base-200 text-primary' : 'text-base-content/70'}`;

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const links = [
    { to: '/', label: 'Problems', icon: ListChecks, end: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/80 backdrop-blur">
      <nav className="navbar mx-auto max-w-7xl gap-2 px-4" aria-label="Main">
        <div className="flex flex-1 items-center gap-6">
          <div className="md:hidden">
            <Dropdown label="Open navigation" align="start" className="w-52" trigger={<Menu size={18} />}>
              {links.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end}>
                    <Icon size={16} /> {label}
                  </NavLink>
                </li>
              ))}
            </Dropdown>
          </div>
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navCls}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
