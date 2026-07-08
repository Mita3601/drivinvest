import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Snowflake, Pencil, Star } from "lucide-react";
import AdminSearch from "./AdminSearch";

type AdminProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  balance: number | string | null;
  referral_code: string | null;
  is_frozen: boolean;
  is_promoter: boolean;
  created_at: string;
};

const formatCFA = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("fr-FR");

const AdminUsers = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{
    id: string;
    balance: string;
  } | null>(null);

  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,user_id,full_name,email,balance,referral_code,is_frozen,is_promoter,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_profiles"] });

  const saveBalance = async () => {
    if (!editing) return;
    const { data, error } = await supabase.rpc("admin_adjust_balance", {
      p_user_id: editing.id,
      p_new_balance: Number(editing.balance),
    });
    if (error || !(data as any)?.success) {
      toast({
        title: "Erreur",
        description: error?.message || (data as any)?.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Solde mis à jour ✅" });
      setEditing(null);
      refresh();
    }
  };

  const toggleFreeze = async (userId: string) => {
    const { data, error } = await supabase.rpc("admin_toggle_freeze", {
      p_user_id: userId,
    });
    if (error || !(data as any)?.success) {
      toast({
        title: "Erreur",
        description: error?.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Compte mis à jour" });
      refresh();
    }
  };

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Impossible de charger la liste des utilisateurs. Vérifie que le compte
        est bien admin et que les droits Supabase sont actifs.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {profiles?.length || 0} utilisateurs
      </p>
      {profiles?.map((p: AdminProfile) => (
        <div
          key={p.id}
          className="rounded-xl bg-secondary border border-border p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-display font-bold text-primary">
              {(p.full_name || p.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground text-sm truncate">
                  {p.full_name || "—"}
                </p>
                {p.is_promoter && (
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                )}
                {p.is_frozen && (
                  <Snowflake className="w-3.5 h-3.5 text-destructive" />
                )}
              </div>
              <p className="text-muted-foreground text-xs truncate">
                {p.email}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-foreground text-sm">
                {formatCFA(p.balance)} F
              </p>
              <p className="text-[10px] text-muted-foreground">
                {p.referral_code}
              </p>
            </div>
          </div>
          {editing?.id === p.user_id ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={editing.balance}
                onChange={(e) =>
                  setEditing({ ...editing, balance: e.target.value })
                }
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
              <button
                onClick={saveBalance}
                className="bg-success text-success-foreground px-3 py-2 rounded-lg text-xs font-bold"
              >
                OK
              </button>
              <button
                onClick={() => setEditing(null)}
                className="bg-secondary border border-border text-foreground px-3 py-2 rounded-lg text-xs"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setEditing({
                    id: p.user_id,
                    balance: String(p.balance ?? "0"),
                  })
                }
                className="flex-1 flex items-center justify-center gap-1 bg-primary/15 text-primary font-bold py-2 rounded-lg text-xs"
              >
                <Pencil className="w-3 h-3" /> Modifier solde
              </button>
              <button
                onClick={() => toggleFreeze(p.user_id)}
                className={`flex-1 flex items-center justify-center gap-1 font-bold py-2 rounded-lg text-xs ${
                  p.is_frozen
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                <Snowflake className="w-3 h-3" />{" "}
                {p.is_frozen ? "Dégeler" : "Geler"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminUsers;
