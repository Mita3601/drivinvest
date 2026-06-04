import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const rules = [
  "Chaque utilisateur doit s'inscrire avec une adresse email valide.",
  "Le solde est crédité uniquement après validation de la preuve de paiement par l'administration.",
  "Les revenus quotidiens sont distribués automatiquement chaque jour sur votre solde.",
  "Le retrait minimum est de 1 500 FCFA. Des frais de 5% sont appliqués sur chaque retrait.",
  "Tout utilisateur peut parrainer d'autres membres et recevoir des commissions sur 3 niveaux : 20%, 5%, 1%.",
  "Les investissements sont d'une durée fixe de 180 jours. Aucun remboursement anticipé n'est possible.",
  "Tout comportement frauduleux entraînera la suspension immédiate du compte sans préavis.",
  "drivinvest se réserve le droit de modifier les conditions d'utilisation à tout moment.",
  "En utilisant la plateforme, vous acceptez l'intégralité de ces conditions.",
];

const RulesPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Règlement</h1>
      </div>
      <div className="mx-4 rounded-2xl bg-secondary border border-border p-5 space-y-3">
        <h2 className="font-display font-bold text-foreground">Conditions Générales d'Utilisation</h2>
        <ol className="space-y-3">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-display font-bold text-primary min-w-[24px]">{i + 1}.</span>
              <span className="text-muted-foreground leading-relaxed">{rule}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default RulesPage;
