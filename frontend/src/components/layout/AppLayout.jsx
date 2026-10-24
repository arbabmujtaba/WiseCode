import { Outlet } from 'react-router';
import Navbar from './Navbar';

// Standard page chrome: sticky navbar + centred content.
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-base-300 py-6 text-center text-xs text-base-content/50">
        WiseCode · Practice DSA with real code execution
      </footer>
    </div>
  );
}
