import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DarkModeToggle from '@/components/DarkModeToggle';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/omr', label: 'OMR Test', icon: '📝' },
  { path: '/countdown', label: 'Countdowns', icon: '⏳' },
  { path: '/pomodoro', label: 'Pomodoro', icon: '🍅' },
  { path: '/todos', label: 'Tasks', icon: '✅' },
  { path: '/notes', label: 'Notes', icon: '📒' },
  { path: '/mistakes', label: 'Mistakes', icon: '🔍' },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-56 bg-card border-r border-border flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 border-b border-border">
          <NavLink to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <span className="text-xl">⚡</span>
            <span className="font-mono font-bold text-foreground text-lg tracking-tight">MyDesk</span>
          </NavLink>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <DarkModeToggle />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground hover:bg-muted p-1.5 rounded-md transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <span className="font-mono font-bold text-foreground text-sm">⚡ MyDesk</span>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
