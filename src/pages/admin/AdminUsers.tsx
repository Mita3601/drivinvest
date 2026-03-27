import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const AdminUsers = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{profiles?.length || 0} utilisateurs inscrits</p>
      {profiles?.map((p) => (
        <div key={p.id} className="rounded-xl bg-secondary border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-display font-bold text-primary">
            {(p.full_name || p.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{p.full_name || "—"}</p>
            <p className="text-muted-foreground text-xs truncate">{p.email}</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-foreground text-sm">{formatCFA(p.balance)} F</p>
            <p className="text-[10px] text-muted-foreground">{p.referral_code}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminUsers;
