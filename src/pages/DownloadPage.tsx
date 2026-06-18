import { ArrowLeft, Download, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DownloadPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">Télécharger l'appli</h1>
      </div>
      <div className="mx-4 rounded-2xl bg-secondary border border-border p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-display font-bold text-lg text-foreground">Installer l'application</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Pour installer PixelVest sur votre téléphone, ouvrez cette page dans votre navigateur
          et cliquez sur <strong className="text-foreground">"Ajouter à l'écran d'accueil"</strong> dans le menu de votre navigateur.
        </p>
        <div className="w-full border-t border-border pt-4 mt-2">
          <p className="text-muted-foreground text-xs">
            L'application fonctionne hors ligne une fois installée et se met à jour automatiquement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
