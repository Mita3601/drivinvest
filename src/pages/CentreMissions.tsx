import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import carBg from "@/assets/car-vip5.jpg";

const missions = [
  { id: 1, desc: "Invitez 5 utilisateurs d'investissement de niveau 1 pour obtenir CFA 1,200", actuel: 5, objectif: 5, reward: 1200 },
  { id: 2, desc: "Invitez 10 utilisateurs d'investissement de niveau 1 pour obtenir CFA 2,500", actuel: 7, objectif: 10, reward: 2500 },
  { id: 3, desc: "Invitez 20 utilisateurs d'investissement de niveau 1 pour obtenir CFA 5,000", actuel: 0, objectif: 20, reward: 5000 },
];

const CentreMissions = () => {
  const navigate = useNavigate();
  const total = 1200;

  return (
    <div className="pb-24">
      <div className="relative h-52">
        <img src={carBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
        <button onClick={() => navigate(-1)} className="absolute top-5 left-4 z-10 text-foreground">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="absolute top-16 left-0 right-0 text-center font-display font-extrabold text-foreground text-3xl tracking-wide z-10">
          CENTRE DE MISSIONS
        </h1>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        <div className="rounded-2xl bg-navy-deep border-gold-gradient p-5 text-center">
          <p className="font-display font-extrabold text-foreground text-4xl">CFA {total.toLocaleString("fr-FR")}</p>
          <p className="text-muted-foreground text-sm mt-1">Récompenses cumulées</p>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-3">
        {missions.map((m) => {
          const done = m.actuel >= m.objectif;
          return (
            <div key={m.id} className="rounded-2xl bg-secondary p-4">
              <div className="flex gap-4 mb-3">
                <p className="font-display font-bold text-foreground text-lg shrink-0">Mission {m.id}</p>
                <p className="text-muted-foreground text-sm">{m.desc}</p>
              </div>
              <div className="grid grid-cols-3 mb-3">
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">{m.actuel}</p>
                  <p className="text-muted-foreground text-xs">Actuel</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">{m.objectif}</p>
                  <p className="text-muted-foreground text-xs">Objectif</p>
                </div>
                <div className="text-center">
                  <p className="font-display font-bold text-foreground text-lg">{m.actuel}/{m.objectif}</p>
                  <p className="text-muted-foreground text-xs">Progression</p>
                </div>
              </div>
              <button
                disabled={!done}
                className={`w-full py-3 rounded-xl font-display font-medium ${
                  done
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "Reçu" : "En cours"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CentreMissions;
