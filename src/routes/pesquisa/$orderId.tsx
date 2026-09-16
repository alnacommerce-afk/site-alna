import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const SCORES = Array.from({ length: 11 }, (_, i) => i);

export const Route = createFileRoute("/pesquisa/$orderId")({
  head: () => ({
    meta: [
      { title: "Pesquisa de satisfação - Alna" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PesquisaPage,
});

type PageStatus = "loading" | "error" | "form" | "finished";
type SubmitResult = { alreadyAnswered: true } | { alreadyAnswered: false; promoter: boolean; referralLink: string | null };

function PesquisaPage() {
  const { orderId } = Route.useParams();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`${FUNCTIONS_URL}/submit-nps-survey?orderId=${orderId}`);
        const json = await resp.json();
        if (!resp.ok) {
          setStatus("error");
          return;
        }
        setCustomerName(json.customerName ?? null);
        setStatus(json.alreadyAnswered ? "finished" : "form");
      } catch {
        setStatus("error");
      }
    }
    load();
  }, [orderId]);

  function finishSurvey() {
    setResult(null);
    setStatus("finished");
  }

  async function handleSubmit() {
    if (wouldRecommend === null || score === null) {
      toast.error("Responda as duas perguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/submit-nps-survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, score, wouldRecommend }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json.error ?? "Não foi possível registrar sua resposta.");
        return;
      }
      setResult(
        json.alreadyAnswered
          ? { alreadyAnswered: true }
          : { alreadyAnswered: false, promoter: json.promoter, referralLink: json.referralLink },
      );
    } catch {
      toast.error("Não foi possível registrar sua resposta agora.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyReferralLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-14">
        {status === "loading" ? (
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        ) : status === "error" ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#12294f]">Link inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Não encontramos o pedido dessa pesquisa. Fale com a gente pelo WhatsApp se precisar de ajuda.
            </p>
          </div>
        ) : status === "finished" ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#12294f]">Pesquisa concluída</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Muito obrigado por participar! Você já pode fechar essa aba.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold text-[#12294f]">
              {customerName ? `Olá, ${customerName}!` : "Pesquisa de satisfação"}
            </h1>

            <div className="mt-8 space-y-8">
              <div>
                <p className="font-semibold text-[#12294f]">Você indicaria nossa loja para alguém?</p>
                <div className="mt-3 flex gap-3">
                  <Button
                    type="button"
                    variant={wouldRecommend === true ? "default" : "outline"}
                    onClick={() => setWouldRecommend(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={wouldRecommend === false ? "default" : "outline"}
                    onClick={() => setWouldRecommend(false)}
                  >
                    Não
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-semibold text-[#12294f]">
                  De zero a 10, qual seria a sua nota pela experiência de compra?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SCORES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                        score === n
                          ? "border-[#16a34a] bg-[#16a34a] text-white"
                          : "border-[#12294f]/20 text-[#12294f] hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : "Submeter pesquisa"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Sua resposta nos ajuda a melhorar nossos serviços.
              </p>
            </div>
          </>
        )}
      </div>
      <SiteFooter />

      <Dialog open={!!result} onOpenChange={(open) => !open && finishSurvey()}>
        <DialogContent>
          {result?.alreadyAnswered ? (
            <>
              <DialogHeader>
                <DialogTitle>Você já respondeu essa pesquisa</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Muito obrigado por participar!</p>
              <Button className="w-full" onClick={finishSurvey}>
                Ok
              </Button>
            </>
          ) : result && !result.promoter ? (
            <>
              <DialogHeader>
                <DialogTitle>Obrigado!</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Agradecemos muito o seu feedback — ele nos ajuda a melhorar cada vez mais.
              </p>
              <Button className="w-full" onClick={finishSurvey}>
                Ok
              </Button>
            </>
          ) : result?.promoter ? (
            <>
              <DialogHeader>
                <DialogTitle>Obrigado! 🎉</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Você pode ganhar <strong>5% de desconto</strong> na próxima compra automaticamente —
                é só indicar nossa loja com o link abaixo. Você também pode ver esse link a
                qualquer momento na aba <strong>Minha Conta</strong>.
              </p>
              {result.referralLink ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs text-[#12294f]">
                    {result.referralLink}
                  </code>
                  <Button type="button" size="icon" variant="outline" onClick={() => copyReferralLink(result.referralLink!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              <Button className="w-full" onClick={finishSurvey}>
                Ok
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
