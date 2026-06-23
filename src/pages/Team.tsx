import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import teamHero from "@/assets/pc-team.jpg";
import pcSilver from "@/assets/pc-vip1.jpg";
import pcGold from "@/assets/pc-vip3.jpg";

const Team = () => {
  const { data: profile, isLoading } = useProfile();
  const { user } = useAuth();
  const refCode = profile?.referral_code || "";
  const referralLink = `${window.location.origin}/auth?ref=${refCode}`;

  const { data: stats } = useQuery({
    queryKey: ["referral_stats", user?.id],
    queryFn: async () => {
      if (!profile?.id)
        return {
          l1: 0,
          l2: 0,
          l3: 0,
          l1_reward: 0,
          l2_reward: 0,
          l3_reward: 0,
          total_reward: 0,
        };
      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("referee_id, level, amount")
        .eq("referrer_id", profile.id);

      const lvl1Referees = new Set<string>();
      const lvl2Referees = new Set<string>();
      const lvl3Referees = new Set<string>();
      let l1_reward = 0,
        l2_reward = 0,
        l3_reward = 0;

      if (rewards) {
        rewards.forEach((r: any) => {
          if (r.level === 1) {
            lvl1Referees.add(r.referee_id);
            l1_reward += r.amount;
          } else if (r.level === 2) {
            lvl2Referees.add(r.referee_id);
            l2_reward += r.amount;
          } else if (r.level === 3) {
            lvl3Referees.add(r.referee_id);
            l3_reward += r.amount;
          }
        });
      }

      return {
        l1: lvl1Referees.size,
        l2: lvl2Referees.size,
        l3: lvl3Referees.size,
        l1_reward,
        l2_reward,
        l3_reward,
        total_reward: l1_reward + l2_reward + l3_reward,
      };
    },
    enabled: !!profile?.id,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copié !` });
  };

  const totalPersons = (stats?.l1 ?? 0) + (stats?.l2 ?? 0) + (stats?.l3 ?? 0);

  return (
    <div className="pb-4">
      {/* Hero */}
      <div className="relative h-44">
        <img
          src={teamHero}
          alt="Equipe"
          className="w-full h-full object-cover"
          width={1280}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="px-4 -mt-4 space-y-5">
        {/* Code */}
        <div className="rounded-2xl bg-secondary p-4">
          <p className="text-muted-foreground text-sm mb-1">
            Code d'invitation
          </p>
          <div className="flex items-center justify-between gap-2">
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="font-display font-bold text-foreground text-2xl">
                {refCode}
              </p>
            )}
            <button
              onClick={() => copy(refCode, "Code")}
              className="rounded-xl border border-foreground/80 px-5 py-2 text-xs font-bold text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              COPIER
            </button>
          </div>
          <div className="h-px bg-border my-4" />
          <p className="text-muted-foreground text-sm mb-1">
            Lien d'invitation
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs truncate">
              {referralLink}
            </p>
            <button
              onClick={() => copy(referralLink, "Lien")}
              className="shrink-0 rounded-xl border border-foreground/80 px-5 py-2 text-xs font-bold text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              COPIER
            </button>
          </div>
        </div>

        {/* Levels */}
        <div className="rounded-2xl bg-secondary border-gold-gradient p-4 space-y-3">
          {[
            {
              lv: "LV1",
              pct: "20%",
              people: stats?.l1 ?? 0,
              reward: stats?.l1_reward ?? 0,
            },
            {
              lv: "LV2",
              pct: "5%",
              people: stats?.l2 ?? 0,
              reward: stats?.l2_reward ?? 0,
            },
            {
              lv: "LV3",
              pct: "1%",
              people: stats?.l3 ?? 0,
              reward: stats?.l3_reward ?? 0,
            },
          ].map((row) => (
            <div key={row.lv} className="grid grid-cols-3 items-center gap-2">
              <div>
                <span className="font-display font-bold text-foreground text-2xl">
                  {row.lv}
                </span>
                <p className="text-primary text-sm">
                  {row.pct}{" "}
                  <span className="text-muted-foreground text-[10px]">
                    Commission
                  </span>
                </p>
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-foreground">
                  {row.people}
                </p>
                <p className="text-muted-foreground text-xs">Personnes</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-foreground">
                  CFA {row.reward.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">Recompense</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary border-gold-gradient p-4 relative overflow-hidden">
            <img
              src={pcSilver}
              alt=""
              className="w-full h-16 object-contain"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <p className="font-display font-bold text-foreground text-3xl mt-1">
              {totalPersons}
            </p>
            <p className="text-muted-foreground text-xs">Total personnes</p>
          </div>
          <div className="rounded-2xl bg-secondary border-gold-gradient p-4 relative overflow-hidden">
            <img
              src={pcGold}
              alt=""
              className="w-full h-16 object-contain"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <p className="font-display font-bold text-foreground text-3xl mt-1">
              CFA {(stats?.total_reward ?? 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs">Total recompenses</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;
