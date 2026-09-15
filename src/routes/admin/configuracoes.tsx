import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToInput, parseCentsFromInput } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ConfiguracoesPage,
});

type SettingsForm = {
  storeName: string;
  cnpj: string;
  razaoSocial: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressCity: string;
  addressState: string;
  businessHours: string;
  instagramHandle: string;
  facebookUrl: string;
  shippingOriginZip: string;
  shippingOriginStreet: string;
  shippingOriginNumber: string;
  shippingOriginNeighborhood: string;
  shippingOriginCity: string;
  shippingOriginState: string;
  shippingCarrierPreference: string;
  freeShippingThreshold: string;
};

const emptyForm: SettingsForm = {
  storeName: "",
  cnpj: "",
  razaoSocial: "",
  phone: "",
  whatsapp: "",
  email: "",
  addressCity: "",
  addressState: "",
  businessHours: "",
  instagramHandle: "",
  facebookUrl: "",
  shippingOriginZip: "",
  shippingOriginStreet: "",
  shippingOriginNumber: "",
  shippingOriginNeighborhood: "",
  shippingOriginCity: "",
  shippingOriginState: "",
  shippingCarrierPreference: "",
  freeShippingThreshold: "100,00",
};

function ConfiguracoesPage() {
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error || !data) {
        toast.error("Não foi possível carregar as configurações.");
        setLoading(false);
        return;
      }

      setForm({
        storeName: data.store_name ?? "",
        cnpj: data.cnpj ?? "",
        razaoSocial: data.razao_social ?? "",
        phone: data.phone ?? "",
        whatsapp: data.whatsapp ?? "",
        email: data.email ?? "",
        addressCity: data.address_city ?? "",
        addressState: data.address_state ?? "",
        businessHours: data.business_hours ?? "",
        instagramHandle: data.instagram_handle ?? "",
        facebookUrl: data.facebook_url ?? "",
        shippingOriginZip: data.shipping_origin_zip ?? "",
        shippingOriginStreet: data.shipping_origin_street ?? "",
        shippingOriginNumber: data.shipping_origin_number ?? "",
        shippingOriginNeighborhood: data.shipping_origin_neighborhood ?? "",
        shippingOriginCity: data.shipping_origin_city ?? "",
        shippingOriginState: data.shipping_origin_state ?? "",
        shippingCarrierPreference: data.shipping_carrier_preference ?? "",
        freeShippingThreshold: formatCentsToInput(data.free_shipping_threshold_cents) || "0,00",
      });
      setLoading(false);
    }
    load();
  }, []);

  function setField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        store_name: form.storeName,
        cnpj: form.cnpj || null,
        razao_social: form.razaoSocial || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address_city: form.addressCity || null,
        address_state: form.addressState || null,
        business_hours: form.businessHours || null,
        instagram_handle: form.instagramHandle || null,
        facebook_url: form.facebookUrl || null,
        shipping_origin_zip: form.shippingOriginZip || null,
        shipping_origin_street: form.shippingOriginStreet || null,
        shipping_origin_number: form.shippingOriginNumber || null,
        shipping_origin_neighborhood: form.shippingOriginNeighborhood || null,
        shipping_origin_city: form.shippingOriginCity || null,
        shipping_origin_state: form.shippingOriginState || null,
        shipping_carrier_preference: form.shippingCarrierPreference || null,
        free_shipping_threshold_cents: parseCentsFromInput(form.freeShippingThreshold),
      })
      .eq("id", "default");

    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar as configurações.");
      return;
    }
    toast.success("Configurações salvas.");
  }

  if (loading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Dados da empresa e contato exibidos no site (rodapé, políticas e WhatsApp).
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="store-name">Nome da loja</Label>
              <Input
                id="store-name"
                value={form.storeName}
                onChange={(e) => setField("storeName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="razao-social">Razão social</Label>
              <Input
                id="razao-social"
                value={form.razaoSocial}
                onChange={(e) => setField("razaoSocial", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail de contato</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone (exibido no site)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="(51) 99491-1125"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsapp">WhatsApp (só números, com DDI)</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp}
                onChange={(e) => setField("whatsapp", e.target.value)}
                placeholder="5551994911125"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address-city">Cidade</Label>
              <Input
                id="address-city"
                value={form.addressCity}
                onChange={(e) => setField("addressCity", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address-state">Estado (UF)</Label>
              <Input
                id="address-state"
                value={form.addressState}
                onChange={(e) => setField("addressState", e.target.value)}
                maxLength={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="instagram">Instagram (usuário, sem @)</Label>
              <Input
                id="instagram"
                value={form.instagramHandle}
                onChange={(e) => setField("instagramHandle", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="facebook">Facebook (URL, opcional)</Label>
              <Input
                id="facebook"
                value={form.facebookUrl}
                onChange={(e) => setField("facebookUrl", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="business-hours">Horário de atendimento</Label>
            <Textarea
              id="business-hours"
              rows={2}
              value={form.businessHours}
              onChange={(e) => setField("businessHours", e.target.value)}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div>
              <h2 className="text-sm font-semibold text-[#12294f]">Envio / Frete</h2>
              <p className="text-xs text-muted-foreground">
                Endereço de origem usado pelo Melhor Envio para calcular o frete e gerar
                etiquetas. Transportadora fixada em J&T Express — nenhuma outra opção é
                oferecida no checkout.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="shipping-carrier">Transportadora</Label>
                <Input
                  id="shipping-carrier"
                  value={form.shippingCarrierPreference}
                  onChange={(e) => setField("shippingCarrierPreference", e.target.value)}
                  placeholder="J&T Express"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping-zip">CEP de origem</Label>
                <Input
                  id="shipping-zip"
                  value={form.shippingOriginZip}
                  onChange={(e) => setField("shippingOriginZip", e.target.value)}
                  placeholder="88353-575"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="shipping-street">Rua</Label>
                <Input
                  id="shipping-street"
                  value={form.shippingOriginStreet}
                  onChange={(e) => setField("shippingOriginStreet", e.target.value)}
                  placeholder="Rua Jardim Centenário"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping-number">Número</Label>
                <Input
                  id="shipping-number"
                  value={form.shippingOriginNumber}
                  onChange={(e) => setField("shippingOriginNumber", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping-neighborhood">Bairro</Label>
                <Input
                  id="shipping-neighborhood"
                  value={form.shippingOriginNeighborhood}
                  onChange={(e) => setField("shippingOriginNeighborhood", e.target.value)}
                  placeholder="Águas Claras"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping-city">Cidade de origem</Label>
                <Input
                  id="shipping-city"
                  value={form.shippingOriginCity}
                  onChange={(e) => setField("shippingOriginCity", e.target.value)}
                  placeholder="Brusque"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shipping-state">UF de origem</Label>
                <Input
                  id="shipping-state"
                  value={form.shippingOriginState}
                  onChange={(e) => setField("shippingOriginState", e.target.value)}
                  maxLength={2}
                  placeholder="SC"
                />
                <p className="text-xs text-muted-foreground">
                  Usado para gerar a etiqueta de envio (remetente).
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="free-shipping-threshold">Frete grátis a partir de (R$)</Label>
                <Input
                  id="free-shipping-threshold"
                  value={form.freeShippingThreshold}
                  onChange={(e) => setField("freeShippingThreshold", e.target.value)}
                  placeholder="100,00"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Exibido na barra verde no topo do site.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
