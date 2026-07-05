import { ArrowLeft, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const QRCode = ({ value }: { value: string }) => {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(value)}`;
  return <img src={src} alt="QR" width={140} height={140} className="rounded-lg" />;
};

const InvitePage = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const refCode = profile?.referral_code || "";
  const referralLink = `${window.location.origin}/auth?ref=${refCode}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copié !` });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative flex items-center justify-center px-4 pt-5 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Invitateur Des Amis</h1>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Lien */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-primary" strokeWidth={2.4} />
            <span className="text-[13px] font-bold uppercase tracking-wide text-primary">
              Votre lien d'invitation
            </span>
          </div>
          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-4 text-[13px] text-foreground/80 break-all">
            {isLoading ? <Skeleton className="h-4 w-64" /> : referralLink}
          </div>
          <button
            onClick={() => copy(referralLink, "Lien")}
            className="mt-3 w-full py-4 rounded-2xl bg-primary text-white font-display font-bold tracking-wide text-lg shadow-lg shadow-primary/30"
          >
            COPIER LIEN
          </button>
        </div>

        {/* Code + QR */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-primary" strokeWidth={2.4} />
            <span className="text-[13px] font-bold uppercase tracking-wide text-primary">
              Code d'invitation
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-3">
              <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 font-display font-bold text-foreground text-lg tracking-widest text-center">
                {isLoading ? <Skeleton className="h-6 w-32 mx-auto" /> : refCode}
              </div>
              <button
                onClick={() => copy(refCode, "Code")}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold"
              >
                Copier
              </button>
            </div>
            <div className="p-2 bg-white rounded-xl border border-border">
              <QRCode value={referralLink} />
            </div>
          </div>
        </div>

        {/* Gains */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-primary" strokeWidth={2.4} />
            <span className="text-[13px] font-bold uppercase tracking-wide text-primary">
              Gains d'invitation
            </span>
          </div>
          <ul className="space-y-3 text-[13px] text-foreground/80 leading-relaxed">
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
              <span>
                Partagez votre privilège d'invitation avec des amis pour qu'ils rejoignent et obtenez un{" "}
                <span className="text-primary font-bold">bonus d'invitation</span> et gagnez une commission.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
              <span>
                Gagnez <span className="text-primary font-bold">5% de commission</span> sur vos directs (niveau A).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
              <span>
                Supplémentaire <span className="text-primary font-bold">2% de commission</span> sur les parrainages de niveau second (niveau B).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
              <span>
                Supplémentaire <span className="text-primary font-bold">1% de commission</span> sur les parrainages de troisième niveau (niveau C).
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
