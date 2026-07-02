import { useState } from "react";
import { ArrowLeft, MessageCircle, Send, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("support_whatsapp_link")
        .limit(1)
        .single();
      return data;
    },
  });

  const whatsappLink =
    (settings as any)?.support_whatsapp_link || "https://wa.me/22900000000";

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !user) {
      toast({
        title: "Erreur",
        description: "Remplissez tous les champs.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      setSubmitted(true);
      toast({
        title: "Ticket envoyé !",
        description: "Nous vous répondrons rapidement.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <CheckCircle className="w-16 h-16 text-success" />
        <h2 className="font-display font-bold text-xl text-foreground">
          Ticket envoyé
        </h2>
        <p className="text-muted-foreground text-sm">
          Notre équipe traitera votre demande dans les plus brefs délais.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl mt-4"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-lg text-foreground">
          Support
        </h1>
      </div>

      <div className="mx-4">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl bg-success/15 border border-success/30 p-4"
        >
          <MessageCircle className="w-6 h-6 text-success" />
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">
              Nous contacter sur WhatsApp
            </p>
            <p className="text-muted-foreground text-xs">
              Réponse rapide garantie
            </p>
          </div>
          <span className="text-success font-bold text-xs">OUVRIR →</span>
        </a>
      </div>

      <div className="mx-4 rounded-2xl bg-secondary border border-border p-5 space-y-4">
        <h2 className="font-display font-bold text-foreground">
          Envoyer un ticket
        </h2>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Sujet
          </label>
          <input
            type="text"
            placeholder="Ex: Problème de retrait"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Message
          </label>
          <textarea
            placeholder="Décrivez votre problème..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !subject.trim() || !message.trim()}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              <Send className="w-4 h-4" /> Envoyer le ticket
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SupportPage;
