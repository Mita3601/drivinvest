import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminSearch from "./AdminSearch";

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// datetime-local to ISO
const toISO = (v: string) => new Date(v).toISOString();

const typeLabels: Record<string, string> = {
  balance: "Bonus solde (F)",
  product_discount: "Remise produit (%)",
  deposit_bonus: "Bonus recharge (%)",
};

const AdminPromoCodes = () => {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [type, setType] = useState<
    "balance" | "product_discount" | "deposit_bonus"
  >("balance");
  const [value, setValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxUsers, setMaxUsers] = useState("10");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin_promo_codes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_codes")
        .select(
          "id,code,type,value,starts_at,ends_at,max_users,uses_count,created_at",
        )
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!code || !value || !startsAt || !endsAt || !maxUsers) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("admin_create_promo_code", {
      p_code: code,
      p_type: type,
      p_value: Number(value),
      p_starts_at: toISO(startsAt),
      p_ends_at: toISO(endsAt),
      p_max_users: Number(maxUsers),
    });
    setCreating(false);
    const res = data as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: "Erreur",
        description: res?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Code créé ✅" });
    setCode("");
    setValue("");
    setStartsAt("");
    setEndsAt("");
    setMaxUsers("10");
    qc.invalidateQueries({ queryKey: ["admin_promo_codes"] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-sm">Créer un code promo</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VOGUE2026"
            />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance">Bonus solde (F)</SelectItem>
                <SelectItem value="product_discount">
                  Remise produit (%)
                </SelectItem>
                <SelectItem value="deposit_bonus">
                  Bonus recharge (%)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{typeLabels[type]}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Max utilisateurs</Label>
            <Input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Début</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Fin</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={creating}
          className="w-full font-bold"
        >
          {creating ? "Création..." : "Générer le code"}
        </Button>
      </div>

      <div>
        <h2 className="font-bold text-sm mb-3">Codes existants</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(codes || []).map((c: any) => {
              const expired = new Date(c.ends_at) < new Date();
              const exhausted = c.uses_count >= c.max_users;
              return (
                <div
                  key={c.id}
                  className="bg-card border border-border rounded-xl p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-display font-bold tracking-wider">
                        {c.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[c.type]} :{" "}
                        <span className="text-foreground font-bold">
                          {c.value}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-bold ${expired || exhausted ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}
                    >
                      {expired ? "Expiré" : exhausted ? "Épuisé" : "Actif"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2 text-muted-foreground">
                    <div>Du {fmtDateTime(c.starts_at)}</div>
                    <div>Au {fmtDateTime(c.ends_at)}</div>
                    <div>
                      Utilisé: {c.uses_count}/{c.max_users}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!codes || codes.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Aucun code
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPromoCodes;
