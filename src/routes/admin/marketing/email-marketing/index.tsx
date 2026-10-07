import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/marketing/email-marketing/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: EmailMarketingPage,
});

const TEMPLATE_ID = "weekly_marketing";
const NO_COUPON = "__none__";
const CAMPAIGN_EVERY_DAYS = 20;

type Subscriber = { email: string; name: string | null; source: string | null; subscribed_at: string };
type Suppression = { email: string; unsubscribed_at: string };
type Coupon = { id: string; code: string; discount_percent: number; min_order_cents: number; active: boolean };
type ProductOption = { id: string; title: string };
type SentCampaign = { id: string; sent_at: string; subject: string; recipients: number };

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function EmailMarketingPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [sentCampaigns, setSentCampaigns] = useState<SentCampaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [couponId, setCouponId] = useState<string>(NO_COUPON);
  const [fallbackIds, setFallbackIds] = useState<string[]>([]);
  const [lastCampaignAt, setLastCampaignAt] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);

  useEffect(() => {
    async function load() {
      const [subs, sups, cps, prods, template, settings, sent] = await Promise.all([
        supabase
          .from("marketing_subscribers")
          .select("email, name, source, subscribed_at")
          .order("subscribed_at", { ascending: false }),
        supabase
          .from("email_suppressions")
          .select("email, unsubscribed_at")
          .order("unsubscribed_at", { ascending: false }),
        supabase
          .from("coupons")
          .select("id, code, discount_percent, min_order_cents, active, personal_for_email")
          .is("personal_for_email", null)
          .order("code"),
        supabase.from("products").select("id, title").eq("status", "published").order("title"),
        supabase
          .from("email_templates")
          .select("coupon_id, featured_product_ids")
          .eq("id", TEMPLATE_ID)
          .maybeSingle(),
        supabase.from("site_settings").select("marketing_last_campaign_at").eq("id", "default").maybeSingle(),
        supabase
          .from("marketing_email_campaigns")
          .select("id, sent_at, subject, recipients")
          .order("sent_at", { ascending: false })
          .limit(20),
      ]);
      setSentCampaigns((sent.data ?? []) as SentCampaign[]);
      setSubscribers((subs.data ?? []) as Subscriber[]);
      setSuppressions((sups.data ?? []) as Suppression[]);
      setCoupons((cps.data ?? []) as Coupon[]);
      setProducts((prods.data ?? []) as ProductOption[]);
      setCouponId(template.data?.coupon_id ?? NO_COUPON);
      setFallbackIds(template.data?.featured_product_ids ?? []);
      setLastCampaignAt(settings.data?.marketing_last_campaign_at ?? null);
      setLoading(false);
    }
    load();
  }, []);

  const nextCampaign = useMemo(() => {
    if (!lastCampaignAt) return null;
    return new Date(new Date(lastCampaignAt).getTime() + CAMPAIGN_EVERY_DAYS * 24 * 60 * 60 * 1000);
  }, [lastCampaignAt]);

  const visibleProducts = products.filter((p) =>
    p.title.toLowerCase().includes(productSearch.trim().toLowerCase()),
  );
  const selectedCoupon = coupons.find((c) => c.id === couponId);

  async function saveCoupon() {
    setSavingCoupon(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ coupon_id: couponId === NO_COUPON ? null : couponId })
      .eq("id", TEMPLATE_ID);
    setSavingCoupon(false);
    if (error) {
      toast.error("Não foi possível salvar o cupom.");
      return;
    }
    toast.success("Cupom da campanha atualizado.");
  }

  async function saveProducts() {
    setSavingProducts(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ featured_product_ids: fallbackIds })
      .eq("id", TEMPLATE_ID);
    setSavingProducts(false);
    if (error) {
      toast.error("Não foi possível salvar os produtos.");
      return;
    }
    toast.success("Produtos de reserva atualizados.");
  }

  function toggleProduct(id: string, checked: boolean) {
    setFallbackIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">E-mail marketing</h1>
        <p className="text-sm text-muted-foreground">
          Uma campanha sai a cada {CAMPAIGN_EVERY_DAYS} dias para todos da lista, com os produtos novos da loja
          e o cupom escolhido abaixo.
          {nextCampaign ? (
            <>
              {" "}
              Próxima campanha: <strong>{nextCampaign.toLocaleDateString("pt-BR")}</strong>.
            </>
          ) : null}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cupom da campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Aparece como botão no e-mail. Ao clicar, o cliente vai para a loja e o código já fica guardado
                no campo de cupom do carrinho.
              </p>
              <Select value={couponId} onValueChange={setCouponId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um cupom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COUPON}>Sem cupom</SelectItem>
                  {coupons.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {Number(c.discount_percent)}%{c.active ? "" : " (inativo)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCoupon && !selectedCoupon.active ? (
                <p className="text-xs text-amber-700">
                  Este cupom está inativo: o e-mail sai sem cupom até você ativá-lo em Cupons.
                </p>
              ) : null}
              <Button onClick={saveCoupon} disabled={savingCoupon}>
                {savingCoupon ? "Salvando..." : "Salvar cupom"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Produtos de reserva ({fallbackIds.length} escolhidos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Usados somente quando não entrou nenhum produto novo na loja desde a última campanha.
              </p>
              <Input
                placeholder="Buscar produto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {visibleProducts.map((product) => (
                  <label key={product.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={fallbackIds.includes(product.id)}
                      onCheckedChange={(checked) => toggleProduct(product.id, checked === true)}
                    />
                    {product.title}
                  </label>
                ))}
                {!visibleProducts.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                ) : null}
              </div>
              <Button onClick={saveProducts} disabled={savingProducts}>
                {savingProducts ? "Salvando..." : "Salvar produtos"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Campanhas enviadas ({sentCampaigns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                O título muda sozinho a cada campanha e nunca se repete.
              </p>
              {sentCampaigns.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Enviados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{formatDate(c.sent_at)}</TableCell>
                        <TableCell>{c.subject.replace("{{nome}}", "[nome]")}</TableCell>
                        <TableCell>{c.recipients}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma campanha enviada ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Na lista de marketing ({subscribers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Entram automaticamente os clientes que dão nota de 4 a 10 na pesquisa.
              </p>
              {subscribers.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Desde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((s) => (
                      <TableRow key={s.email}>
                        <TableCell className="break-all">{s.email}</TableCell>
                        <TableCell>{s.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(s.subscribed_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Ninguém na lista ainda.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saíram da lista ({suppressions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Clientes que clicaram em &quot;AQUI&quot; no rodapé de um e-mail. Não recebem mais promoções nem
                lembretes de carrinho.
              </p>
              {suppressions.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Saiu em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppressions.map((s) => (
                      <TableRow key={s.email}>
                        <TableCell className="break-all">{s.email}</TableCell>
                        <TableCell>{formatDate(s.unsubscribed_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Ninguém saiu até agora.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
