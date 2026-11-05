import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REQUEST_TYPES = [
  { value: "acesso", label: "Quero saber quais dados vocês têm sobre mim" },
  { value: "correcao", label: "Quero corrigir dados incorretos ou desatualizados" },
  { value: "exclusao", label: "Quero excluir meus dados" },
  { value: "portabilidade", label: "Quero receber meus dados em outro formato" },
  { value: "revogacao", label: "Quero retirar meu consentimento" },
  { value: "informacao", label: "Quero saber com quem compartilhamos meus dados" },
  { value: "outro", label: "Outro assunto" },
] as const;

// Formulário LGPD (art. 18): o visitante registra o pedido e recebe um protocolo.
// A gravação passa pela função `create_data_request`, que devolve só o protocolo.
export function LgpdRequestForm() {
  const [requestType, setRequestType] = useState<string>(REQUEST_TYPES[0].value);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirmed) {
      toast.error("Confirme que você é o titular dos dados ou representa o titular.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("create_data_request", {
      p_request_type: requestType,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_details: details,
    });
    setLoading(false);
    if (error || !data) {
      toast.error("Não foi possível registrar seu pedido. Tente novamente ou fale pelo WhatsApp.");
      return;
    }
    setProtocol(String(data));
  }

  if (protocol) {
    return (
      <div className="rounded-md border border-[#15803d]/30 bg-[#15803d]/5 p-4 text-sm">
        <p className="font-semibold text-[#15803d]">Pedido registrado.</p>
        <p className="mt-1 text-[#12294f]">
          Seu protocolo é <strong className="font-mono">{protocol}</strong>. Guarde este número.
          Respondemos em até 15 dias, pelo e-mail informado.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="lgpd-type">O que você quer fazer?</Label>
        <select
          id="lgpd-type"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="lgpd-name">Nome completo</Label>
          <Input id="lgpd-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lgpd-email">E-mail</Label>
          <Input
            id="lgpd-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lgpd-phone">WhatsApp (opcional)</Label>
          <Input id="lgpd-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="lgpd-details">Detalhes (opcional)</Label>
        <textarea
          id="lgpd-details"
          rows={4}
          maxLength={2000}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="lgpd-confirm"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="lgpd-confirm" className="text-sm font-normal leading-snug">
          Confirmo que sou o titular dos dados ou represento o titular. Para proteger seus dados,
          podemos pedir uma confirmação de identidade antes de responder.
        </Label>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#15803d] font-bold hover:bg-[#15803d]/90 sm:w-auto"
      >
        {loading ? "Enviando..." : "Enviar pedido"}
      </Button>
    </form>
  );
}
