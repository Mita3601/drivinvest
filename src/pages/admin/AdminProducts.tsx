import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Save, Snowflake } from "lucide-react";
import AdminSearch from "./AdminSearch";

const formatCFA = (n: number) => Number(n || 0).toLocaleString("fr-FR");

type Row = {
  id: string;
  name: string;
  price: number;
  daily_return: number;
  total_return: number;
  duration: number;
  is_starter: boolean;
  is_frozen: boolean;
};

const ProductRow = ({ row }: { row: Row }) => {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState<string>(String(row.price));
  const [daily, setDaily] = useState<string>(String(row.daily_return));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setPrice(String(row.price));
    setDaily(String(row.daily_return));
  }, [row.price, row.daily_return]);

  const dailyNum = Number(daily) || 0;
  const previewTotal = dailyNum * row.duration;
  const dirty =
    Number(price) !== Number(row.price) ||
    dailyNum !== Number(row.daily_return);

  const save = async () => {
    const p = Number(price);
    const d = Number(daily);
    if (!p || p <= 0 || d < 0) {
      toast({ title: "Valeurs invalides", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("admin_update_investment_type", {
      p_id: row.id,
      p_price: p,
      p_daily_return: d,
    });
    if (error || !(data as any)?.success) {
      toast({
        title: "Erreur",
        description: error?.message || (data as any)?.error || "Échec",
        variant: "destructive",
      });
    } else {
      toast({ title: "Produit mis à jour ✓" });
      queryClient.invalidateQueries({ queryKey: ["admin_investment_types"] });
      queryClient.invalidateQueries({ queryKey: ["investment_types"] });
    }
    setSaving(false);
  };

  const toggleFreeze = async () => {
    setToggling(true);
    const { data, error } = await supabase.rpc(
      "admin_toggle_investment_type_freeze",
      {
        p_id: row.id,
        p_is_frozen: !row.is_frozen,
      },
    );
    if (error || !(data as any)?.success) {
      toast({
        title: "Erreur",
        description: error?.message || (data as any)?.error || "Échec",
        variant: "destructive",
      });
    } else {
      toast({ title: row.is_frozen ? "Produit dégélé" : "Produit gelé" });
      queryClient.invalidateQueries({ queryKey: ["admin_investment_types"] });
      queryClient.invalidateQueries({ queryKey: ["investment_types"] });
    }
    setToggling(false);
  };

  return (
    <div className="rounded-xl bg-secondary border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-foreground text-sm truncate">{row.name}</p>
        <div className="flex items-center gap-2">
          {row.is_starter && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              STARTER
            </span>
          )}
          {row.is_frozen && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
              GELÉ
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-muted-foreground font-bold">
            Prix (F)
          </span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="block">
          <span className="text-[10px] text-muted-foreground font-bold">
            Revenu / jour (F)
          </span>
          <input
            type="number"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Durée : <b className="text-foreground">{row.duration}j</b>
        </span>
        <span>
          Total : <b className="text-foreground">{formatCFA(previewTotal)} F</b>
        </span>
      </div>

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="w-full bg-red-cta text-foreground font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? "..." : "Enregistrer"}
      </button>

      <button
        onClick={toggleFreeze}
        disabled={toggling}
        className={`w-full font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-40 ${
          row.is_frozen
            ? "bg-success/15 text-success"
            : "bg-destructive/15 text-destructive"
        }`}
      >
        {row.is_frozen ? (
          <>
            <Snowflake className="w-3.5 h-3.5" />
            {toggling ? "..." : "Dégeler le produit"}
          </>
        ) : (
          <>
            <Snowflake className="w-3.5 h-3.5" />
            {toggling ? "..." : "Geler le produit"}
          </>
        )}
      </button>
    </div>
  );
};

const AdminProducts = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin_investment_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_types")
        .select(
          "id,name,price,daily_return,total_return,duration,is_starter,is_frozen",
        )
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
  });

  if (isLoading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );

  const q = search.trim().toLowerCase();
  const list = !q ? data || [] : (data || []).filter((r) => r.name.toLowerCase().includes(q));

  return (
    <div className="space-y-3">
      <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher un produit..." />
      <p className="text-muted-foreground text-xs">
        {list.length} produits — modifie le prix et le revenu quotidien.
        Le revenu total est recalculé automatiquement (revenu/jour × durée).
      </p>
      {list.map((row) => (
        <ProductRow key={row.id} row={row} />
      ))}
    </div>
  );
};

export default AdminProducts;
