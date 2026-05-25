import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Star, Gift, UserPlus } from "lucide-react";

const formatCFA = (n: number) => n.toLocaleString("fr-FR");

const AdminPromoters = () => {
  const qc = useQueryClient();
  const [grantingFor, setGrantingFor] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin_profiles_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["investment_types"],
    queryFn: async () => {
      const { data } = await supabase.from("investment_types").select("*").order("price", { ascending: true });
      return data || [];
    },
  });

  const togglePromoter = async (userId: string) => {
    const { data, error } = await supabase.rpc("admin_toggle_promoter", { p_user_id: userId });
    if (error || !(data as any)?.success) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour" });
      qc.invalidateQueries({ queryKey: ["admin_profiles_all"] });
    }
  };

  const grantProduct = async (userId: string) => {
    if (!productId) {
      toast({ title: "Sélectionnez un produit", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.rpc("admin_grant_product", { p_user_id: userId, p_type_id: productId });
    if (error || !(data as any)?.success) {
      toast({ title: "Erreur", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Produit octroyé ✅" });
      setGrantingFor(null);
      setProductId("");
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  const promoters = (profiles || []).filter((p: any) => p.is_promoter);
  const others = (profiles || []).filter((p: any) => !p.is_promoter);

  const Card = ({ p }: { p: any }) => (
    <div className="rounded-xl bg-secondary border border-border p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-display font-bold text-primary">
          {(p.full_name || p.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-foreground text-sm truncate">{p.full_name || "—"}</p>
            {p.is_promoter && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
          </div>
          <p className="text-muted-foreground text-xs truncate">{p.email}</p>
        </div>
        <p className="font-display font-bold text-foreground text-sm">{formatCFA(p.balance)} F</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => togglePromoter(p.user_id)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold ${p.is_promoter ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
          <UserPlus className="w-3 h-3" /> {p.is_promoter ? "Retirer" : "Nommer promoteur"}
        </button>
        {p.is_promoter && (
          <button onClick={() => setGrantingFor(grantingFor === p.user_id ? null : p.user_id)} className="flex-1 flex items-center justify-center gap-1 bg-success/15 text-success font-bold py-2 rounded-lg text-xs">
            <Gift className="w-3 h-3" /> Octroyer produit
          </button>
        )}
      </div>
      {grantingFor === p.user_id && (
        <div className="flex gap-2 pt-1">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="flex-1 bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground">
            <option value="">— Produit —</option>
            {products?.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name} ({formatCFA(pr.price)} F)</option>)}
          </select>
          <button onClick={() => grantProduct(p.user_id)} className="bg-success text-success-foreground px-4 py-2 rounded-lg text-xs font-bold">Octroyer</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-primary text-xs font-bold uppercase mb-2">Promoteurs actifs ({promoters.length})</p>
        <div className="space-y-3">
          {promoters.length ? promoters.map((p: any) => <Card key={p.id} p={p} />) : <p className="text-muted-foreground text-xs">Aucun promoteur.</p>}
        </div>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-bold uppercase mb-2">Autres utilisateurs ({others.length})</p>
        <div className="space-y-3">
          {others.map((p: any) => <Card key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
};

export default AdminPromoters;
