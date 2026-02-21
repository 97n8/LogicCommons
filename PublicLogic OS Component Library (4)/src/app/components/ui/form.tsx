import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Upload, X, File as FileIcon } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn("block mb-2", className)}>{children}</label>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-3 bg-black/32 border border-line rounded-small text-[15px] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark placeholder:text-text-muted/40",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-3 bg-black/32 border border-line rounded-small text-[15px] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark placeholder:text-text-muted/40 min-h-[100px]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full px-4 py-3 bg-black/32 border border-line rounded-small text-[15px] text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
  ({ className, label, ...props }, ref) => (
    <label className="inline-flex items-center gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer appearance-none w-5 h-5 rounded-[4px] border border-line bg-black/32 transition-all checked:bg-accent-primary checked:border-accent-primary focus:ring-1 focus:ring-accent-primary/50",
            className
          )}
          {...props}
        />
        <svg
          className="absolute w-3.5 h-3.5 text-bg-dark opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {label && <span className="text-[14px] text-text-primary">{label}</span>}
    </label>
  )
);
Checkbox.displayName = "Checkbox";

interface FileSubmitProps {
  onFilesChange: (files: { name: string; url: string; path: string }[]) => void;
  isLoading?: boolean;
  API_BASE: string;
  publicAnonKey: string;
  dept?: string;
}

export const FileSubmit = ({ onFilesChange, isLoading, API_BASE, publicAnonKey, dept = "PHILLIPSTON" }: FileSubmitProps) => {
  const [files, setFiles] = React.useState<{ name: string; url: string; path: string }[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const newFiles = [...files];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles.item(i);
      if (!file) continue;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dept', dept);

      try {
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'apikey': publicAnonKey,
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          newFiles.push(data);
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    setFiles(newFiles);
    onFilesChange(newFiles);
    setIsUploading(false);
  };

  const removeFile = (path: string) => {
    const newFiles = files.filter(f => f.path !== path);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUploading || isLoading}
        />
        <div className={cn(
          "flex flex-col items-center justify-center p-6 border-2 border-dashed border-line rounded-small transition-all",
          isUploading ? "bg-accent-primary/5 border-accent-primary/40" : "hover:border-accent-primary/40 hover:bg-surface-hover"
        )}>
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-accent-primary font-bold uppercase">Uploading to Archieve...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-text-muted mb-2" />
              <span className="text-[14px] font-bold">Attach Supporting Documents</span>
              <span className="text-[12px] text-text-muted">PDF, Images, or Documents (Max 10MB)</span>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div key={file.path} className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-line rounded-pill group">
              <FileIcon className="w-4 h-4 text-accent-primary" />
              <span className="text-xs font-medium truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(file.path)}
                className="p-1 hover:text-danger transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
