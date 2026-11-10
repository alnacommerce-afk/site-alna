// Relatórios para o Discord. Chamada pelo pg_cron com o token guardado no Vault (verify_jwt = false; quem
// chama tem que mandar o token certo). Nenhum segredo sai da função.
//   modo "marketing" (13h de Brasília): acessos de ontem, acessos/compras por link UTM e carrinhos abandonados
//                    das últimas 24 h, com o contato de cada um para o dono chamar.
//   modo "setores"   (18h de Brasília, padrão): auditoria diária e situação dos setores.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadGa4Credentials } from "../_shared/google-analytics-auth.ts";

const TESTES = ["aleqs.santos", "informacoes.asm", "alnaexpedicao"];
const FUSO = "America/Sao_Paulo";
const DIA_MS = 24 * 3600 * 1000;
const SEM_UTM = "(sem link UTM)";

type Admin = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Dia de ontem em Brasília, com início e fim em UTC (para filtrar created_at).
function intervaloDeOntem(agora: Date) {
  const hojeBr = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora); // AAAA-MM-DD
  const [a, m, d] = hojeBr.split("-").map(Number);
  const inicioHoje = new Date(Date.UTC(a, m - 1, d, 3, 0, 0)); // 00:00 em Brasília = 03:00 UTC
  const inicioOntem = new Date(inicioHoje.getTime() - DIA_MS);
  const dataOntem = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(inicioOntem);
  return { inicio: inicioOntem.toISOString(), fim: inicioHoje.toISOString(), dataOntem };
}

const hora = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(d);
const ehTeste = (email: string | null) => !!email && TESTES.some((t) => email.toLowerCase().includes(t));
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const motivoErro = (erro: unknown) => (erro instanceof Error ? erro.message.slice(0, 80) : "erro");

// ---------- GA4 ----------

async function ga4Relatorio(admin: Admin, corpo: Record<string, unknown>) {
  const credenciais = await loadGa4Credentials(admin);
  if (!credenciais) return null;
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${credenciais.propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credenciais.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }], ...corpo }),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  return res.json();
}

async function acessosTotais(admin: Admin) {
  const json = await ga4Relatorio(admin, { metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] });
  if (!json) return null;
  const v = json.rows?.[0]?.metricValues?.map((x: { value: string }) => Number(x.value)) ?? [0, 0, 0];
  return { usuarios: v[0], sessoes: v[1], visualizacoes: v[2] };
}

// Pessoas ativas por campanha de link (utm_campaign) ontem. "(not set)" = sem link UTM.
async function acessosPorCampanha(admin: Admin): Promise<Map<string, number> | null> {
  const json = await ga4Relatorio(admin, {
    dimensions: [{ name: "sessionCampaignName" }],
    metrics: [{ name: "activeUsers" }],
    limit: 100,
  });
  if (!json) return null;
  const mapa = new Map<string, number>();
  for (const linha of json.rows ?? []) {
    const nome = linha.dimensionValues?.[0]?.value ?? "(not set)";
    const chave = nome === "(not set)" ? SEM_UTM : nome;
    mapa.set(chave, (mapa.get(chave) ?? 0) + Number(linha.metricValues?.[0]?.value ?? 0));
  }
  return mapa;
}

// ---------- Relatório de marketing (13h) ----------

async function relatorioMarketing(admin: Admin, agora: Date): Promise<string[]> {
  const { inicio, fim, dataOntem } = intervaloDeOntem(agora);
  const inicio24h = new Date(agora.getTime() - DIA_MS).toISOString();

  const [pedidosRes, carrinhosRes, bloqueadosRes, totaisRes, campanhasRes] = await Promise.all([
    admin.from("orders").select("total_cents, customer_email, utm_campaign").in("payment_status", ["RECEIVED", "CONFIRMED"]).gte("created_at", inicio).lt("created_at", fim),
    admin.from("abandoned_carts")
      .select("email, phone, item_count, subtotal_cents, summary, utm_campaign, stopped_at, recovered_at")
      .gt("item_count", 0)
      .gte("last_activity_at", inicio24h)
      .lte("last_activity_at", agora.toISOString()),
    admin.from("blocked_emails").select("email"),
    acessosTotais(admin).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
    acessosPorCampanha(admin).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
  ]);
  if (pedidosRes.error) throw new Error(pedidosRes.error.message);
  if (carrinhosRes.error) throw new Error(carrinhosRes.error.message);
  const bloqueados = new Set((bloqueadosRes.data ?? []).map((b) => String(b.email).toLowerCase()));

  // Compras de ontem (sem os testes do dono).
  const pedidos = pedidosRes.data ?? [];
  const pedidosReais = pedidos.filter((p) => !ehTeste(p.customer_email));

  // Carrinhos com atividade nas últimas 24 h: separa os de contato real dos de teste, bloqueados e opt-out.
  const carrinhos = carrinhosRes.data ?? [];
  const contatar = carrinhos.filter((c) => !c.recovered_at && !c.stopped_at && !ehTeste(c.email) && !bloqueados.has(String(c.email).toLowerCase()));
  const pediramParar = carrinhos.filter((c) => !!c.stopped_at && !ehTeste(c.email)).length;
  const testes = carrinhos.filter((c) => ehTeste(c.email)).length;
  const bloqueadosNoPeriodo = carrinhos.filter((c) => bloqueados.has(String(c.email).toLowerCase())).length;

  // Tabela por link UTM: acessos (GA4), compras (pedidos) e carrinhos (últimas 24 h).
  const porLink = new Map<string, { acessos: number; compras: number; valor: number; carrinhos: number }>();
  const linha = (chave: string) => {
    if (!porLink.has(chave)) porLink.set(chave, { acessos: 0, compras: 0, valor: 0, carrinhos: 0 });
    return porLink.get(chave)!;
  };
  if (campanhasRes.ok && campanhasRes.v) for (const [k, n] of campanhasRes.v) linha(k).acessos += n;
  for (const p of pedidosReais) {
    const l = linha(p.utm_campaign ?? SEM_UTM);
    l.compras += 1;
    l.valor += p.total_cents ?? 0;
  }
  for (const c of contatar) linha(c.utm_campaign ?? SEM_UTM).carrinhos += 1;

  const tabela = [...porLink.entries()]
    .sort((a, b) => b[1].acessos - a[1].acessos || b[1].carrinhos - a[1].carrinhos)
    .map(([k, v]) => `• ${k}: ${v.acessos} acessos · ${v.compras} compras (${reais(v.valor)}) · ${v.carrinhos} carrinho(s)`);

  const acessosLinha = campanhasRes.ok
    ? "" // o total de acessos aparece na linha de acessos abaixo
    : `indisponível hoje (${motivoErro(campanhasRes.e)})`;
  let acessos = "sem dado (GA4 não configurado)";
  if (totaisRes.ok && totaisRes.v) acessos = `${totaisRes.v.usuarios} usuários, ${totaisRes.v.sessoes} sessões, ${totaisRes.v.visualizacoes} visualizações`;
  else if (!totaisRes.ok) acessos = `indisponível hoje (${motivoErro(totaisRes.e)})`;

  const topo = [
    `**Marketing de ${dataOntem} (relatório das ${hora(agora)})**`,
    "",
    `• Acessos de ontem: ${acessos}`,
    `• Compras pagas de ontem: ${pedidosReais.length}, ${reais(pedidosReais.reduce((s, p) => s + (p.total_cents ?? 0), 0))} (testes do dono: ${pedidos.length - pedidosReais.length})`,
    "",
    "**Por link UTM (acessos e compras de ontem; carrinhos das últimas 24 h):**",
    ...(tabela.length ? tabela : ["• sem dados"]),
    ...(acessosLinha ? [`• ${acessosLinha}`] : []),
    "",
    `**Carrinhos abandonados nas últimas 24 h: ${contatar.length}**`,
    `(testes: ${testes} · bloqueados: ${bloqueadosNoPeriodo} · pediram para não receber lembretes: ${pediramParar})`,
  ];

  const lista = contatar.map((c) => {
    const resumo = (c.summary ?? "").slice(0, 160);
    const contato = c.phone ? `WhatsApp ${c.phone}` : "sem WhatsApp";
    return `• ${c.email} · ${contato} · ${reais(c.subtotal_cents ?? 0)} · ${resumo} · link: ${c.utm_campaign ?? SEM_UTM}`;
  });

  return [topo.join("\n"), lista.length ? lista.join("\n") : "Nenhum carrinho para contatar agora.", "Os contatos acima são de clientes que salvaram o carrinho e aceitaram lembretes. Não compartilhe fora do grupo."];
}

// ---------- Relatório dos setores (18h) ----------

const PAGINAS = [
  { nome: "Home", url: "https://alna.sale/" },
  { nome: "Atacado", url: "https://alna.sale/atacado" },
  { nome: "Loja", url: "https://store.alna.sale/loja" },
  { nome: "Carrinho", url: "https://store.alna.sale/carrinho" },
  { nome: "Checkout", url: "https://store.alna.sale/checkout" },
];

async function verificarPagina(p: { nome: string; url: string }) {
  const inicio = Date.now();
  try {
    const r = await fetch(p.url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    const segundos = (Date.now() - inicio) / 1000;
    const tempo = `${segundos.toFixed(2).replace(".", ",")} s`;
    if (r.status !== 200) return `• ${p.nome}: ERRO ${r.status} (${tempo})`;
    return `• ${p.nome}: OK, ${tempo}${segundos > 2 ? " ⚠ lenta" : ""}`;
  } catch {
    return `• ${p.nome}: FORA DO AR`;
  }
}

const dataHora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "nunca";
const diasDesde = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);

async function relatorioSetores(admin: Admin, agora: Date): Promise<string[]> {
  const { dataOntem } = intervaloDeOntem(agora);
  const [resumoRes, paginas] = await Promise.all([admin.rpc("auditoria_resumo"), Promise.all(PAGINAS.map(verificarPagina))]);
  if (resumoRes.error) throw new Error(resumoRes.error.message);
  const resumo = (resumoRes.data ?? {}) as Record<string, string | number | null>;

  const ultimoPedido = resumo.ultimo_pedido_qualquer as string | null;
  const ultimoCarrinho = resumo.ultimo_carrinho_salvo as string | null;
  const ultimaTarefa = resumo.ultima_tarefa_agente as string | null;
  const falhas = Number(resumo.agendamentos_com_falha_24h ?? 0);
  const estoque100 = Number(resumo.variantes_estoque_100 ?? 0);
  const hoje = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(agora);
  const auditoria = [
    `**A1. Páginas:**`,
    ...paginas,
    `**A2. Pedidos:** ${diasDesde(ultimoPedido) > 3 ? "⚠" : "OK"} último pedido criado em ${dataHora(ultimoPedido)}`,
    `**A3. Carrinhos salvos:** ${diasDesde(ultimoCarrinho) > 3 ? "⚠" : "OK"} último em ${dataHora(ultimoCarrinho)}`,
    `**A4. Agendamentos:** ${falhas > 0 ? `⚠ ${falhas} falha(s) nas últimas 24 h` : "OK, nenhuma falha nas últimas 24 h"}`,
    `**A5. Setores (registro no banco):** ${diasDesde(ultimaTarefa) > 3 ? `⚠ sem registro desde ${dataHora(ultimaTarefa)}` : `OK, último registro em ${dataHora(ultimaTarefa)}`}`,
    `**A6. Estoque:** ${estoque100} variações com 100 unidades, aguardando confirmação do dono`,
  ];

  return [
    [
      `**Setores — relatório de ${dataOntem} (das ${hora(agora)})**`,
      "",
      `**AUDITORIA DIÁRIA (automática) — ${hoje}**`,
      ...auditoria,
      "",
      "Responda pelo número do item (ex.: A2). Nada foi publicado sem o seu ok.",
    ].join("\n"),
  ];
}

// ---------- Envio ----------

// Divide em mensagens de até 1900 caracteres (limite do Discord), sem cortar uma linha no meio.
function emPartes(textos: string[]): string[] {
  const partes: string[] = [];
  let atual = "";
  for (const bloco of textos) {
    for (const linha of bloco.split("\n")) {
      if ((atual + "\n" + linha).length > 1900) {
        if (atual) partes.push(atual);
        atual = linha.slice(0, 1900);
      } else {
        atual = atual ? atual + "\n" + linha : linha;
      }
    }
    if (atual) partes.push(atual);
    atual = "";
  }
  return partes;
}

async function enviarDiscord(admin: Admin, textos: string[]) {
  const { data: webhook, error } = await admin.rpc("relatorio_webhook_url");
  if (error || !webhook) throw new Error("webhook do Discord não encontrado no Vault");
  for (const content of emPartes(textos)) {
    const envio = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!envio.ok) throw new Error(`Discord ${envio.status}`);
  }
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const body = await req.json().catch(() => ({}));
    const { data: tokenOk } = await admin.rpc("relatorio_token_valido", { t: body.token ?? "" });
    if (!tokenOk) return jsonResponse({ error: "não autorizado" }, 401);

    const modo = body.modo === "marketing" ? "marketing" : "setores";
    const agora = new Date();
    const textos = modo === "marketing" ? await relatorioMarketing(admin, agora) : await relatorioSetores(admin, agora);
    await enviarDiscord(admin, textos);
    return jsonResponse({ enviado: true, modo });
  } catch (erro) {
    console.error("[relatorio-diario]", erro);
    return jsonResponse({ error: erro instanceof Error ? erro.message : "erro desconhecido" }, 500);
  }
});
