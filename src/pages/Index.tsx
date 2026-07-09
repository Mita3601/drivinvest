import { useEffect, useRef, useState } from "react";
import {
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  UserPlus,
  Ticket,
  Tag,
  Info,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import bannerImg from "@/assets/pc-banner.jpg";
import pc1 from "@/assets/pc-vip1.jpg";
import pc2 from "@/assets/pc-vip2.jpg";
import pc3 from "@/assets/pc-vip3.jpg";
import pc4 from "@/assets/pc-vip4.jpg";
import pc5 from "@/assets/pc-vip5.jpg";
import pc6 from "@/assets/pc-vip6.jpg";
import teamImg from "@/assets/pc-team.jpg";

const slides = [
  { src: bannerImg, label: "PixelVest" },
  { src: pc1, label: "Fujitsu Lifebook" },
  { src: pc2, label: "Fujitsu Celsius" },
  { src: pc3, label: "Fujitsu Esprimo" },
  { src: pc4, label: "Fujitsu Stylistic" },
  { src: pc5, label: "Workstation Pro" },
  { src: pc6, label: "Tower Suprême" },
  { src: teamImg, label: "Notre équipe" },
];

const Index = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  // Carousel auto-scroll
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3500);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // Bonus quotidien
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [bonusAmount] = useState(50);

  const loadBonus = async () => {
    const { data, error } = await supabase.rpc("get_daily_bonus_status");
    if (error) return;
    const d = data as any;
    const next = d?.next_at ? new Date(d.next_at) : null;
    setCanClaim(!!d?.can_claim && (!next || next.getTime() <= Date.now()));
  };
  useEffect(() => {
    loadBonus();
  }, [profile?.id]);

  // Auto-verify a MoneyFusion deposit when returning from the payment page.
  // The return URL is `${origin}/#/?deposit_ref=REF`.
  useEffect(() => {
    const parseRef = () => {
      try {
        // Query params can live in the hash (HashRouter) or the real search.
        const hash = window.location.hash || "";
        const qIndex = hash.indexOf("?");
        const hashParams = new URLSearchParams(
          qIndex >= 0 ? hash.slice(qIndex + 1) : "",
        );
        const searchParams = new URLSearchParams(window.location.search);
        return (
          hashParams.get("deposit_ref") || searchParams.get("deposit_ref") || ""
        );
      } catch {
        return "";
      }
    };
    const reference = parseRef();
    if (!reference) return;

    let cancelled = false;
    let attempts = 0;
    let toastShown = false;

    const cleanUrl = () => {
      const clean = `${window.location.origin}${window.location.pathname}#/`;
      window.history.replaceState({}, "", clean);
    };

    const tick = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        const { data } = await supabase.functions.invoke(
          "moneyfusion-verify",
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: { reference },
          },
        );
        const st = (data as any)?.status;
        if (st === "approved") {
          if (!toastShown) {
            toastShown = true;
            toast({
              title: "Dépôt confirmé ✅",
              description: "Votre solde a été crédité automatiquement.",
            });
          }
          qc.invalidateQueries({ queryKey: ["profile"] });
          cleanUrl();
          return;
        }
        if (st === "rejected") {
          toast({
            title: "Dépôt échoué",
            description: "Le paiement n'a pas été confirmé.",
            variant: "destructive",
          });
          cleanUrl();
          return;
        }
      } catch {
        /* retry */
      }
      if (attempts < 15 && !cancelled) {
        setTimeout(tick, 4000);
      } else if (!cancelled) {
        toast({
          title: "Vérification en cours…",
          description:
            "Votre dépôt sera crédité dès la confirmation MoneyFusion.",
        });
        cleanUrl();
      }
    };
    // Kick off quickly then poll.
    tick();
    return () => {
      cancelled = true;
    };
  }, [qc]);


  const claimBonus = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_daily_bonus");
    setClaiming(false);
    const r = data as any;
    if (error || !r?.success) {
      toast({
        title: "Indisponible",
        description: r?.error || "Réessayez plus tard.",
      });
      loadBonus();
      return;
    }
    toast({
      title: `+${r.amount} FCFA`,
      description: "Bonus quotidien crédité.",
    });
    setCanClaim(false);
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const actions = [
    { label: "Mon Produit", icon: Package, path: "/my-products" },
    { label: "Recharger", icon: ArrowDownCircle, path: "/recharge" },
    { label: "Retrait", icon: ArrowUpCircle, path: "/retrait" },
    { label: "Mon équipe", icon: Users, path: "/team" },
    { label: "Inviter", icon: UserPlus, path: "/invite" },
    { label: "Code Promo", icon: Ticket, path: "/promo" },
  ];
  const balance = Number(profile?.balance ?? 0);
  const formatCFA = (value: number) => value.toLocaleString("fr-FR");

  return (
    <div className="space-y-6 pb-6">
      {/* Carousel */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden aspect-[16/9] bg-secondary border border-border shadow-md">
          {slides.map((s, i) => (
            <img
              key={i}
              src={s.src}
              alt={s.label}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <span className="font-display font-bold text-white text-sm drop-shadow">
              {slides[index].label}
            </span>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Solde visible */}
      <div className="px-4">
        <div className="rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] opacity-80">
                Solde disponible
              </p>
              <p className="mt-1 text-2xl font-display font-bold">
                {formatCFA(balance)} F
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 p-3">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="px-4 grid grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-card border border-border py-5 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <Icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
              <span className="text-xs font-medium text-foreground text-center">
                {a.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tâches quotidiennes */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-foreground text-sm tracking-wide">
            TÂCHES QUOTIDIENNES
          </h2>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">
              Tâches de connexion quotidienne
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">1/1</span>
              <span className="text-success font-display font-bold text-base">
                {bonusAmount.toFixed(2)}{" "}
                <span className="text-[10px]">FCFA</span>
              </span>
            </div>
          </div>
          <button
            onClick={claimBonus}
            disabled={!canClaim || claiming}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
          >
            {claiming ? "..." : canClaim ? "Recevoir" : "Reçu"}
          </button>
        </div>
      </div>

      {/* Information Fujitsu */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-foreground text-sm tracking-wide">
            INFORMATION
          </h2>
        </div>
        <div className="space-y-3">
          <article className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="flex gap-3 p-3">
              <img
                src={pc2}
                alt="Fujitsu"
                className="w-24 h-24 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground text-sm mb-1">
                  Fujitsu — Leader mondial
                </h3>
                <p className="text-muted-foreground text-xs leading-snug line-clamp-4">
                  Fujitsu Limited est une multinationale japonaise fondée en
                  1935, l'un des plus grands fabricants mondiaux d'ordinateurs,
                  de serveurs et de solutions informatiques d'entreprise.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="flex gap-3 p-3">
              <img
                src={pc4}
                alt="À propos Fujitsu"
                className="w-24 h-24 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground text-sm mb-1">
                  À propos
                </h3>
                <p className="text-muted-foreground text-xs leading-snug line-clamp-4">
                  Présent dans plus de 100 pays avec plus de 124 000
                  collaborateurs, Fujitsu conçoit des ordinateurs Lifebook,
                  Celsius et Esprimo réputés pour leur fiabilité et leur
                  innovation au service des professionnels.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="flex gap-3 p-3">
              <img
                src={pc5}
                alt="Innovation Fujitsu"
                className="w-24 h-24 rounded-xl object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-foreground text-sm mb-1">
                  Innovation & R&D
                </h3>
                <p className="text-muted-foreground text-xs leading-snug line-clamp-4">
                  Fujitsu investit massivement dans l'intelligence artificielle,
                  le supercalculateur Fugaku et les technologies quantiques,
                  faisant de la marque un pilier de la tech mondiale.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Index;
