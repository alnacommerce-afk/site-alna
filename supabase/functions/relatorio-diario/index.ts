// Relatório diário das 18h (Brasília) para o Discord. Chamada pelo pg_cron (21h UTC).
// Protegida por um token guardado no Vault (verify_jwt = false no config.toml; quem chama tem que
// mandar o token certo). Lê números reais do banco e do GA4 (acessos de ontem), monta o texto e envia
// pelo webhook guardado no Vault. Nenhum segredo sai da função.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadGa4Credentials } from "../_shared/google-analytics-auth.ts";

const TESTES = ["aleqs.santos", "informacoes.asm", "alnaexpedicao"];
const FUSO = "America/Sao_Paulo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Dia de ontem em Brasília, com início e fim em UTC (para filtrar created_at).
function intervaloDeOntem(agora: Date) {
  const hojeBr = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora); // AAAA-MM-DD
  const [a, m, d] = hojeBr.split("-").map(Number);
  const inicioHoje = new Date(Date.UTC(a, m - 1, d, 3, 0, 0)); // 00:00 em Brasília = 03:00 UTC
  const inicioOntem = new Date(inicioHoje.getTime() - 24 * 3600 * 1000);
  const dataOntem = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(inicioOntem);
  return { inicio: inicioOntem.toISOString(), fim: inicioHoje.toISOString(), dataOntem };
}

const ehTeste = (email: string | null) => !!email && TESTES.some((t) => email.toLowerCase().includes(t));
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function acessosGa4(admin: ReturnType<typeof createClient>) {
  const credenciais = await loadGa4Credentials(admin);
  if (!credenciais) return null;
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${credenciais.propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credenciais.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    }),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const valores = json.rows?.[0]?.metricValues?.map((v: { value: string }) => Number(v.value)) ?? [0, 0, 0];
  return { usuarios: valores[0], sessoes: valores[1], visualizacoes: valores[2] };
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { data: tokenOk } = await admin.rpc("relatorio_token_valido", { t: body.token ?? "" });
    if (!tokenOk) return jsonResponse({ error: "não autorizado" }, 401);

    const { inicio, fim, dataOntem } = intervaloDeOntem(new Date());
    const [pedidosRes, carrinhosRes, tarefasRes] = await Promise.all([
      admin.from("orders").select("total_cents, customer_email").in("payment_status", ["RECEIVED", "CONFIRMED"]).gte("created_at", inicio).lt("created_at", fim),
      admin.from("abandoned_carts").select("email").gte("created_at", inicio).lt("created_at", fim),
      admin.from("agent_task").select("setor, titulo, status").gte("atualizado_em", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    ]);
    if (pedidosRes.error || carrinhosRes.error || tarefasRes.error) {
      throw new Error(pedidosRes.error?.message ?? carrinhosRes.error?.message ?? tarefasRes.error?.message);
    }

    const pedidos = pedidosRes.data ?? [];
    const pagos = pedidos.filter((p) => !ehTeste(p.customer_email));
    const pagosTeste = pedidos.length - pagos.length;
    const valor = pagos.reduce((soma, p) => soma + (p.total_cents ?? 0), 0);
    const carrinhos = carrinhosRes.data ?? [];
    const carrinhosReais = carrinhos.filter((c) => !ehTeste(c.email)).length;
    const carrinhosTeste = carrinhos.length - carrinhosReais;

    let acessos = "sem dado (GA4 não configurado)";
    try {
      const g = await acessosGa4(admin);
      if (g) acessos = `${g.usuarios} usuários, ${g.sessoes} sessões, ${g.visualizacoes} visualizações de página`;
    } catch (erro) {
      acessos = `indisponível hoje (${erro instanceof Error ? erro.message.slice(0, 80) : "erro"})`;
    }

    const setores = (tarefasRes.data ?? []).map((t) => `• ${t.setor}: ${t.titulo} (${t.status})`).join("\n") || "• nenhuma tarefa tocada";

    const texto = [
      `**Relatório de ${dataOntem}**`,
      "",
      "**Marketing (dados reais do dia):**",
      `• Acessos: ${acessos}`,
      `• Carrinhos salvos: ${carrinhosReais} (testes do dono: ${carrinhosTeste})`,
      `• Compras pagas: ${pagos.length}, ${reais(valor)} (testes do dono: ${pagosTeste})`,
      "",
      "**Setores (tarefas tocadas nas últimas 24h):**",
      setores,
      "",
      "Nada foi publicado sem o seu ok.",
    ].join("\n");

    const { data: webhook, error: erroWebhook } = await admin.rpc("relatorio_webhook_url");
    if (erroWebhook || !webhook) throw new Error("webhook do Discord não encontrado no Vault");

    const envio = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: texto.slice(0, 1990) }),
    });
    if (!envio.ok) throw new Error(`Discord ${envio.status}`);

    return jsonResponse({ enviado: true, data: dataOntem, acessos });
  } catch (erro) {
    console.error("[relatorio-diario]", erro);
    return jsonResponse({ error: erro instanceof Error ? erro.message : "erro desconhecido" }, 500);
  }
});
