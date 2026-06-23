import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refCode, setRefCode] = useState(searchParams.get("ref") || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        navigate("/");
        return;
      }
    } else {
      if (!agreeTerms) {
        toast({
          title: "Erreur",
          description: "Vous devez accepter les politiques d'utilisation",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, refCode);
      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Inscription réussie !",
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary rounded-2xl border border-border max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="font-display font-bold text-lg text-foreground">
                Politiques d'Utilisation
              </h2>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">
                      Âge minimum 20 ans :
                    </strong>{" "}
                    L'accès et l'utilisation de cette plateforme est
                    déconseillée aux personnes de moins de 20 ans.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">
                      Aucune poursuite judiciaire :
                    </strong>{" "}
                    Aucune poursuite judiciaire ne peut être engagée par les
                    investisseurs contre la plateforme ou ses opérateurs en cas
                    de litige.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">
                      Responsabilité personnelle :
                    </strong>{" "}
                    Chaque utilisateur est seul responsable de ses actions et
                    investissements sur la plateforme. Tout investissement est
                    effectué de plein gré sans aucune contrainte.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">
                      Fermeture de la plateforme :
                    </strong>{" "}
                    L'équipe se réserve le droit de fermer la plateforme à tout
                    moment sans l'approbation préalable des investisseurs.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display font-extrabold text-3xl text-gradient-gold">
            PixelVest
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="w-full mt-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Votre nom"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mt-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Mot de passe
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Code parrain (optionnel)
              </label>
              <input
                type="text"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                className="w-full mt-1 bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: VA3F8B2C"
              />
            </div>
          )}

          {!isLogin && (
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Veuillez lire les politiques d'utilisation avant de
                  continuer
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border bg-secondary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  J'accepte les{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary font-bold hover:underline"
                  >
                    politiques d'utilisation
                  </button>
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Se connecter
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> S'inscrire
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-bold"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
