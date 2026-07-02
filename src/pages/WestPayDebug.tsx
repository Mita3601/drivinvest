// debug-westpay.ts
// Fichier de diagnostic pour débugguer les paiements WestPay
// Copier dans src/pages/ pour tester

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const WestPayDebug = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    console.log(msg);
  };

  const testWestPayFunction = async () => {
    setLogs([]);
    setLoading(true);
    addLog("🧪 Test WestPay Function...");

    try {
      addLog("1️⃣ Vérification session...");
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        addLog("❌ Pas de session active - connectez-vous d'abord");
        setLoading(false);
        return;
      }
      addLog(`✓ Session OK: ${session.session.user.id}`);

      addLog("2️⃣ Appel fonction westpay-init...");
      const { data, error } = await supabase.functions.invoke("westpay-init", {
        body: {
          amount: 5000,
          country: "Togo",
          returnOrigin: window.location.origin,
        },
      });

      if (error) {
        addLog(`❌ Erreur fonction: ${error.message}`);
        addLog(`Code: ${error.code}`);
        setLoading(false);
        return;
      }

      addLog("✓ Réponse reçue");
      addLog(`📊 Data: ${JSON.stringify(data, null, 2)}`);

      if (data?.paymentUrl) {
        addLog(`✓ URL de paiement générée: ${data.paymentUrl}`);
        addLog("🎯 Cliquez ici pour tester: " + data.paymentUrl);
      } else if (data?.error) {
        addLog(`❌ Erreur dans la réponse: ${data.error}`);
      } else {
        addLog("❌ Réponse invalide - pas de paymentUrl ni d'erreur");
      }
    } catch (err: any) {
      addLog(`❌ Exception: ${err.message}`);
      addLog(`Stack: ${err.stack}`);
    } finally {
      setLoading(false);
    }
  };

  const testTransactionTable = async () => {
    setLogs([]);
    setLoading(true);
    addLog("🧪 Test Table Transactions...");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        addLog("❌ Pas de session active");
        setLoading(false);
        return;
      }

      addLog("1️⃣ Requête transactions...");
      const { data, error, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        addLog(`❌ Erreur: ${error.message}`);
        setLoading(false);
        return;
      }

      addLog(`✓ ${count} transactions trouvées`);
      if (data?.length > 0) {
        data.forEach((tx, i) => {
          addLog(
            `  [${i + 1}] ${tx.type} | ${tx.amount} | ${tx.status} | ${tx.reference}`,
          );
        });
      }
    } catch (err: any) {
      addLog(`❌ Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLogs([]);
    setLoading(true);
    addLog("🧪 Test Webhook...");

    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/westpay-webhook`;
      addLog(`1️⃣ URL Webhook: ${webhookUrl}`);

      const testPayload = {
        event: "payment.confirmed",
        txId: "OP-test123456",
        ref: "WP-TEST1234567890",
        amount: 5000,
        payer: "+22890123456",
        country: "Togo",
        timestamp: new Date().toISOString(),
      };

      addLog("2️⃣ Envoi test webhook (signature vide)...");
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RobotPay-Signature": "invalid_signature_for_test",
          "X-RobotPay-Event": "payment.confirmed",
        },
        body: JSON.stringify(testPayload),
      });

      addLog(`Status: ${res.status}`);
      const responseText = await res.text();
      addLog(`Réponse: ${responseText}`);

      if (res.status === 401) {
        addLog("✓ Webhook rejet signature (attendu) - Bon signe!");
      } else if (res.status === 500) {
        addLog("❌ Erreur serveur - variables d'env manquantes?");
      }
    } catch (err: any) {
      addLog(`❌ Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    addLog("📋 Logs copiés au presse-papiers");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">🔧 WestPay Debug Console</h1>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={testWestPayFunction}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Fonction WestPay
        </button>
        <button
          onClick={testTransactionTable}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Table Transactions
        </button>
        <button
          onClick={testWebhook}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Webhook
        </button>
        <button
          onClick={copyLogs}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          📋 Copier Logs
        </button>
      </div>

      <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto font-mono text-sm space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500">
            Cliquez sur un bouton pour commencer...
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.includes("❌")
                  ? "text-red-600"
                  : log.includes("✓")
                    ? "text-green-600"
                    : log.includes("1️⃣") || log.includes("2️⃣")
                      ? "text-blue-600 font-bold"
                      : "text-gray-800"
              }`}
            >
              {log}
            </div>
          ))
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
        <h3 className="font-bold mb-2">📝 Checklist:</h3>
        <ul className="space-y-1 text-xs">
          <li>✓ Vous êtes connecté (session active)</li>
          <li>✓ La fonction westpay-init répond (status 200)</li>
          <li>✓ Le paymentUrl est généré</li>
          <li>✓ Les transactions sont créées en base</li>
          <li>✓ Le webhook rejette les signatures invalides (401)</li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <h3 className="font-bold mb-2">ℹ️ Notes:</h3>
        <ul className="space-y-1 text-xs">
          <li>
            • Assurez-vous que WESTPAY_MERCHANT_SLUG est défini dans .env.local
          </li>
          <li>• Vérifiez que les secrets Supabase sont configurés</li>
          <li>
            • Ouvrez les logs Supabase pour plus de détails:
            https://app.supabase.com
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WestPayDebug;
