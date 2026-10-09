import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Store } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GOOGLE_REVIEW_URL, storeLink } from "@/lib/site-urls";
import { useSiteSettings } from "@/lib/site-data";

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const SCORES = Array.from({ length: 11 }, (_, i) => i);
// Up to this score the customer is asked what happened; from the next one up we also invite them to
// review us on Google.
const FEEDBACK_MAX_SCORE = 5;
const GOOGLE_REVIEW_MIN_SCORE = 6;

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
type SubmitResult = { promoter: boolean; referralLink: string | null; score: number };

function BackToStoreButton() {
  return (
    <Button
      asChild
      size="lg"
      className="h-14 w-full gap-2 bg-[#15803d] text-base font-bold shadow-md hover:bg-[#15803d]"
    >
      <a href={storeLink("/loja")}>
        <Store className="h-5 w-5" />
        Voltar para a loja
      </a>
    </Button>
  );
}

function PesquisaPage() {
  const { orderId } = Route.useParams();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  // Same percentage as the RECOMPENSA_INDICACAO coupon.
  const { data: siteSettings } = useSiteSettings();
  const rewardPercent = siteSettings?.referral_reward_percent ? Number(siteSettings.referral_reward_percent) : null;

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
      if (json.alreadyAnswered) {
        setStatus("finished");
        return;
      }
      setResult({ promoter: json.promoter, referralLink: json.referralLink, score });
    } catch {
      toast.error("Não foi possível registrar sua resposta agora.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendFeedback() {
    if (!feedback.trim()) {
      toast.error("Escreva a sua mensagem antes de enviar.");
      return;
    }
    setSendingFeedback(true);
    try {
      const resp = await fetch(`${FUNCTIONS_URL}/submit-nps-survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "feedback", feedback }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json.error ?? "Não foi possível enviar a sua mensagem.");
        return;
      }
      setFeedbackSent(true);
    } catch {
      toast.error("Não foi possível enviar a sua mensagem agora.");
    } finally {
      setSendingFeedback(false);
    }
  }

  function copyReferralLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  }

  const answered = result !== null;

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
            <div className="mt-8">
              <BackToStoreButton />
            </div>
          </div>
        ) : status === "finished" ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#12294f]">Você já respondeu essa pesquisa</h1>
            <p className="mt-2 text-sm text-muted-foreground">Muito obrigado por participar!</p>
            <div className="mt-8">
              <BackToStoreButton />
            </div>
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
                    disabled={answered}
                    onClick={() => setWouldRecommend(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={wouldRecommend === false ? "default" : "outline"}
                    disabled={answered}
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
                      disabled={answered}
                      onClick={() => setScore(n)}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                        score === n
                          ? "border-[#15803d] bg-[#15803d] text-white"
                          : "border-[#12294f]/20 text-[#12294f] hover:bg-muted disabled:opacity-60 disabled:hover:bg-transparent"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={submitting || answered}>
                {answered ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Resposta enviada
                  </>
                ) : submitting ? (
                  "Enviando..."
                ) : (
                  "Submeter pesquisa"
                )}
              </Button>

              {!answered ? (
                <p className="text-center text-xs text-muted-foreground">
                  Sua resposta nos ajuda a melhorar nossos serviços.
                </p>
              ) : null}
            </div>

            {result ? (
              <div className="mt-8 space-y-5 border-t border-[#12294f]/10 pt-8">
                <h2 className="text-center text-xl font-bold text-[#12294f]">Obrigado! 🎉</h2>

                {result.score <= FEEDBACK_MAX_SCORE ? (
                  <div className="rounded-md bg-[#12294f]/5 p-4">
                    {feedbackSent ? (
                      <p className="flex items-start gap-2 text-sm text-[#12294f]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#15803d]" />
                        Recebemos a sua mensagem. Vamos olhar com atenção — obrigado por ajudar a melhorar!
                      </p>
                    ) : (
                      <>
                        <p className="font-semibold text-[#12294f]">Nos diga o que aconteceu</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Queremos entender e melhorar. Conte com sinceridade o que não saiu como esperado.
                        </p>
                        <Textarea
                          className="mt-3 bg-white"
                          rows={4}
                          maxLength={1000}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Escreva aqui"
                        />
                        <Button
                          className="mt-3 w-full"
                          onClick={handleSendFeedback}
                          disabled={sendingFeedback || !feedback.trim()}
                        >
                          {sendingFeedback ? "Enviando..." : "Enviar mensagem"}
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}

                {result.score >= GOOGLE_REVIEW_MIN_SCORE ? (
                  <div className="rounded-md bg-[#12294f]/5 p-4">
                    <p className="text-sm text-[#12294f]">
                      Somos uma loja pequena e cada avaliação no Google nos ajuda a alcançar mais pessoas.
                      Se puder dedicar 1 minuto, você estará fazendo parte do nosso crescimento. Muito
                      obrigado por nos ajudar!
                    </p>
                    <Button asChild className="mt-3 w-full">
                      <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                        Nos avalie no Google
                      </a>
                    </Button>
                  </div>
                ) : null}

                {result.promoter ? (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Você pode ganhar <strong>{rewardPercent ? `${rewardPercent}% de desconto` : "um desconto"}</strong> na próxima compra automaticamente —
                      é só indicar nossa loja com o link abaixo. Você também pode ver esse link a
                      qualquer momento na aba <strong>Minha Conta</strong>.
                    </p>
                    {result.referralLink ? (
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs text-[#12294f]">
                          {result.referralLink}
                        </code>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => copyReferralLink(result.referralLink!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <BackToStoreButton />
              </div>
            ) : null}
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
