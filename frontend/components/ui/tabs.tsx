import * as React from "react"

interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ options, activeId, onChange, className = "" }) => {
  return (
    <div className={`flex border-b border-zinc-800 space-x-6 ${className}`}>
      {options.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative py-3 text-sm font-medium transition-colors select-none cursor-pointer focus:outline-none ${
              isActive ? "text-zinc-150" : "text-zinc-550 hover:text-zinc-300"
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-200" />
            )}
          </button>
        );
      })}
    </div>
  );
};
