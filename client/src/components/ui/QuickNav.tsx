import { Link, useLocation } from "wouter";

export interface QuickNavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

export function QuickNav({ items }: { items: QuickNavItem[] }) {
  const [location] = useLocation();
  if (items.length <= 1) return null;
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
      {items.map(({ href, icon: Icon, label }) => {
        const active = location === href;
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-bold border transition-all flex-shrink-0 ${
              active
                ? "bg-brand-orange border-brand-orange text-white glow-orange pointer-events-none"
                : "glass-panel border-white/15 text-white/60 hover:text-white hover:border-white/30"
            }`}>
            <Icon size={15} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
