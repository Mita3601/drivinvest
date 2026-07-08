import { Search } from "lucide-react";

interface AdminSearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const AdminSearch = ({ value, onChange, placeholder }: AdminSearchProps) => (
  <div className="relative">
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Rechercher..."}
      className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    />
  </div>
);

export default AdminSearch;
