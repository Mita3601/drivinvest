import { ArrowLeft, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AboutPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">À propos de nous</h1>
      </div>
      <div className="mx-4 rounded-2xl bg-secondary border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-8 h-8 text-primary" />
          <h2 className="font-display font-bold text-xl text-gradient-gold">PixelVest</h2>
        </div>
        <p className="text-foreground text-sm leading-relaxed">
          PixelVest est une plateforme d'investissement innovante spécialisée dans le secteur
          de la haute technologie : ordinateurs portables, stations de travail et PC gaming nouvelle génération.
          Notre mission est de démocratiser l'accès aux opportunités d'investissement rentables en Afrique.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Chaque investisseur peut participer à la chaîne de valeur tech et recevoir des revenus quotidiens
          garantis pendant 180 jours. Notre système de parrainage à 3 niveaux permet également de maximiser
          vos gains en invitant votre réseau.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sécurité, transparence et rentabilité sont nos maîtres mots. Rejoignez la communauté PixelVest
          et commencez à faire fructifier votre capital dès aujourd'hui.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
