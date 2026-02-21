import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Table = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("w-full overflow-x-auto", className)}>
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>
);

export const THead = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <thead className={cn("bg-black/20 border-b border-line", className)}>
    <tr>
      {children}
    </tr>
  </thead>
);

export const TBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-line/50">
    {children}
  </tbody>
);

export const TR = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <tr 
    onClick={onClick}
    className={cn("transition-colors hover:bg-surface-hover/50", className)}
  >
    {children}
  </tr>
);

export const TH = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <th className={cn("px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-text-muted", className)}>
    {children}
  </th>
);

export const TD = ({ children, className, colSpan }: { children: React.ReactNode, className?: string, colSpan?: number }) => (
  <td colSpan={colSpan} className={cn("px-4 py-4 text-[14px] font-normal", className)}>
    {children}
  </td>
);

export const Alert = ({ children, title, variant = 'info', className }: { children: React.ReactNode, title?: string, variant?: 'info' | 'warning' | 'danger' | 'success', className?: string }) => {
  const variants = {
    info: "bg-accent-primary/5 border-accent-primary/20 text-accent-primary",
    warning: "bg-warning/5 border-warning/20 text-warning",
    danger: "bg-danger/5 border-danger/20 text-danger",
    success: "bg-success/5 border-success/20 text-success"
  };
  return (
    <div className={cn("p-4 rounded-small border flex flex-col gap-1", variants[variant], className)}>
      {title && <span className="text-xs font-bold uppercase tracking-wider">{title}</span>}
      <div className="text-[13px]">{children}</div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-bg-medium border border-line rounded-large w-full max-w-2xl shadow-large overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Spinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
