import type { LucideIcon } from "lucide-react";
import LogoMark from "./LogoMark";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
}

export default function Header({ navItems }: { navItems: NavItem[] }) {
  return (
    <header className="bg-navy-900 text-white">
      <div className="h-14 flex items-center px-6">
        <LogoMark size={28} />
        <span className="ml-2.5 text-sm font-semibold tracking-wide uppercase">
          LabPilot <span className="text-gold-400">AI</span>
        </span>

        <nav className="ml-10 flex items-center h-14">
          {navItems.map(({ label, icon: Icon, active, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={`h-14 px-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-gold-500 text-white"
                  : "border-transparent text-navy-200 hover:text-white hover:border-navy-500"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center text-xs font-semibold border border-navy-500">
            H
          </div>
        </div>
      </div>
    </header>
  );
}
