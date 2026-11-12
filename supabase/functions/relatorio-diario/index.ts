// Relatórios para o Discord. Chamada pelo pg_cron com o token guardado no Vault (verify_jwt = false; quem
// chama tem que mandar o token certo). Nenhum segredo sai da função.
//   modo "marketing" (13h de Brasília): acessos, páginas e links UTM (visualizações), compras, carrinhos
//                    salvos, e-mails enviados e lista negra; e a lista de contato dos carrinhos das últimas 24 h.
//   modo "setores"   (18h de Brasília, padrão): 1) auditoria e velocidade, 2) o que cada setor fez nas últimas
//                    24 h, 3) pendências com prioridade.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { loadGa4Credentials } from "../_shared/google-analytics-auth.ts";

const TESTES = ["aleqs.santos", "informacoes.asm", "alnaexpedicao"];
const FUSO = "America/Sao_Paulo";
const DIA_MS = 24 * 3600 * 1000;
const SEM_UTM = "(sem link UTM)";
// Meta de velocidade (regra do dono): Home abre em até 0,5 s. Demais páginas: alerta acima de 2 s.
const META_HOME_S = 0.5;
const ALERTA_S = 2;
// Status de tarefa em aberto (ver docs/planos/continuidade-e-orquestracao.md).
const STATUS_ABERTOS = ["pedido", "planejado", "aprovado", "executando", "conferido"];

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

const dataDeHoje = (agora: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(agora);
const hora = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(d);
const ehTeste = (email: string | null) => !!email && TESTES.some((t) => email.toLowerCase().includes(t));
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const segundosTexto = (s: number) => `${s.toFixed(2).replace(".", ",")} s`;
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

type LinhaGa4 = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

async function acessosTotais(admin: Admin) {
  const json = await ga4Relatorio(admin, { metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] });
  if (!json) return null;
  const v = json.rows?.[0]?.metricValues?.map((x: { value: string }) => Number(x.value)) ?? [0, 0, 0];
  return { usuarios: v[0], sessoes: v[1], visualizacoes: v[2] };
}

// Por link (utm_campaign) ontem: pessoas e visualizações. "(not set)" = sem link UTM.
async function acessosPorCampanha(admin: Admin): Promise<Map<string, { pessoas: number; visualizacoes: number }> | null> {
  const json = await ga4Relatorio(admin, {
    dimensions: [{ name: "sessionCampaignName" }],
    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    limit: 100,
  });
  if (!json) return null;
  const mapa = new Map<string, { pessoas: number; visualizacoes: number }>();
  for (const linha of (json.rows ?? []) as LinhaGa4[]) {
    const nome = linha.dimensionValues?.[0]?.value ?? "(not set)";
    const chave = nome === "(not set)" ? SEM_UTM : nome;
    const atual = mapa.get(chave) ?? { pessoas: 0, visualizacoes: 0 };
    atual.pessoas += Number(linha.metricValues?.[0]?.value ?? 0);
    atual.visualizacoes += Number(linha.metricValues?.[1]?.value ?? 0);
    mapa.set(chave, atual);
  }
  return mapa;
}

// Páginas mais vistas ontem. Caminho sem domínio: a Home e a loja usam domínios diferentes.
async function paginasMaisVistas(admin: Admin): Promise<{ caminho: string; visualizacoes: number }[] | null> {
  const json = await ga4Relatorio(admin, {
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 3,
  });
  if (!json) return null;
  return ((json.rows ?? []) as LinhaGa4[]).map((l) => ({
    caminho: l.dimensionValues?.[0]?.value ?? "/",
    visualizacoes: Number(l.metricValues?.[0]?.value ?? 0),
  }));
}

// ---------- Relatório de marketing (13h) ----------

async function relatorioMarketing(admin: Admin, agora: Date): Promise<string[]> {
  const { inicio, fim, dataOntem } = intervaloDeOntem(agora);
  const agoraIso = agora.toISOString();
  const inicio24h = new Date(agora.getTime() - DIA_MS).toISOString();

  const [pedidosRes, carrinhosRes, bloqueadosRes, emailsRes, totaisRes, campanhasRes, paginasRes] = await Promise.all([
    admin.from("orders").select("total_cents, customer_email, utm_campaign, coupon_code").in("payment_status", ["RECEIVED", "CONFIRMED"]).gte("created_at", inicio).lt("created_at", fim),
    admin.from("abandoned_carts")
      .select("email, phone, item_count, subtotal_cents, summary, utm_campaign, stopped_at, recovered_at")
      .gt("item_count", 0)
      .gte("last_activity_at", inicio24h)
      .lte("last_activity_at", agoraIso),
    admin.from("blocked_emails").select("email"),
    admin.from("email_send_log").select("to_email").gte("created_at", inicio24h).lte("created_at", agoraIso),
    acessosTotais(admin).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
    acessosPorCampanha(admin).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
    paginasMaisVistas(admin).then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e })),
  ]);
  if (pedidosRes.error) throw new Error(pedidosRes.error.message);
  if (carrinhosRes.error) throw new Error(carrinhosRes.error.message);
  const bloqueados = new Set((bloqueadosRes.data ?? []).map((b) => String(b.email).toLowerCase()));
  const ehBloqueado = (email: string | null) => bloqueados.has(String(email).toLowerCase());

  // Compras pagas de ontem (sem os testes do dono).
  const pedidosReais = (pedidosRes.data ?? []).filter((p) => !ehTeste(p.customer_email));
  const comCupom = pedidosReais.filter((p) => !!p.coupon_code).length;

  // Carrinhos salvos nas últimas 24 h (sem os testes do dono).
  const carrinhosReais = (carrinhosRes.data ?? []).filter((c) => !ehTeste(c.email));
  const contatar = carrinhosReais.filter((c) => !c.recovered_at && !c.stopped_at && !ehBloqueado(c.email));
  const pediramParar = carrinhosReais.filter((c) => !!c.stopped_at).length;

  // E-mails enviados nas últimas 24 h: pessoas distintas (sem os testes do dono).
  const emailsEnviados = emailsRes.error
    ? null
    : new Set((emailsRes.data ?? []).map((e) => String(e.to_email).toLowerCase()).filter((e) => !ehTeste(e))).size;

  // ACESSOS
  let acessos = `indisponível hoje (${motivoErro(totaisRes.ok ? null : totaisRes.e)})`;
  if (totaisRes.ok) {
    acessos = totaisRes.v
      ? `${totaisRes.v.sessoes} acessos (sessões) · ${totaisRes.v.usuarios} usuários · ${totaisRes.v.visualizacoes} visualizações`
      : "sem dado (GA4 não configurado)";
  }
  let paginas = "sem dado";
  if (paginasRes.ok && paginasRes.v?.length) {
    paginas = paginasRes.v.map((p) => `${p.caminho.slice(0, 50)} (${p.visualizacoes})`).join(", ");
  } else if (!paginasRes.ok) {
    paginas = `indisponível hoje (${motivoErro(paginasRes.e)})`;
  }

  // LINK UTM: só links com visualização nas últimas 24 h.
  const porLink = [...(campanhasRes.ok && campanhasRes.v ? campanhasRes.v : new Map<string, { pessoas: number; visualizacoes: number }>()).entries()];
  const comVisualizacao = porLink
    .filter(([chave, v]) => chave !== SEM_UTM && v.visualizacoes > 0)
    .sort((a, b) => b[1].visualizacoes - a[1].visualizacoes);
  const semUtm = porLink.find(([chave]) => chave === SEM_UTM)?.[1].visualizacoes ?? 0;
  const linhasUtm = comVisualizacao.map(([k, v]) => `• ${k}: ${v.visualizacoes} visualizações (${v.pessoas} pessoas)`);
  if (semUtm > 0) linhasUtm.push(`• sem link UTM: ${semUtm} visualizações`);
  if (!campanhasRes.ok) linhasUtm.push(`• indisponível hoje (${motivoErro(campanhasRes.e)})`);
  else if (!linhasUtm.length) linhasUtm.push("• nenhum link com visualização nas últimas 24 h");

  // COMPRAS
  const valorPago = reais(pedidosReais.reduce((s, p) => s + (p.total_cents ?? 0), 0));

  // NOTIFICAÇÃO
  const emailsLinha = emailsEnviados === null ? "indisponível hoje" : `${emailsEnviados} pessoa(s) receberam algum e-mail`;

  const cabecalho = [
    `**MARKETING DE ${dataDeHoje(agora)} (relatório das ${hora(agora)})**`,
    `Dados: acessos e links de ontem (${dataOntem}); compras de ontem; carrinhos, e-mails e lista negra das últimas 24 h.`,
  ].join("\n");

  const acessosBloco = [
    "**ACESSOS**",
    `• ${acessos}`,
    `• Páginas mais vistas: ${paginas}`,
  ].join("\n");

  const utmBloco = ["**LINK UTM (visualizações nas últimas 24 h)**", ...linhasUtm].join("\n");

  const comprasBloco = [
    "**COMPRAS**",
    `• ${carrinhosReais.length} carrinho(s) salvo(s) nas últimas 24 h`,
    `• ${comCupom} pedido(s) com cupom (pagos de ontem)`,
    `• ${pedidosReais.length} pedido(s) pago(s) de ontem: ${valorPago}`,
  ].join("\n");

  const notificacaoBloco = [
    "**NOTIFICAÇÃO**",
    `• ${emailsLinha}`,
    `• ${bloqueados.size} e-mail(s) bloqueado(s) na lista negra; ${carrinhosReais.filter((c) => ehBloqueado(c.email)).length} com carrinho nas últimas 24 h`,
    `• Pediram para não receber lembretes: ${pediramParar}`,
  ].join("\n");

  const contatoBloco = [
    `**CONTATAR: ${contatar.length} carrinho(s) salvo(s) sem compra (últimas 24 h)**`,
    ...(contatar.length
      ? contatar.map((c) => {
          const resumo = (c.summary ?? "").slice(0, 160);
          const contato = c.phone ? `WhatsApp ${c.phone}` : "sem WhatsApp";
          return `• ${c.email} · ${contato} · ${reais(c.subtotal_cents ?? 0)} · ${resumo} · link: ${c.utm_campaign ?? SEM_UTM}`;
        })
      : ["Nenhum carrinho para contatar agora."]),
  ].join("\n");

  const rodape = "Contatos: clientes que salvaram o carrinho e aceitaram lembretes. Não compartilhe fora do grupo.";

  return [cabecalho, acessosBloco, utmBloco, comprasBloco, notificacaoBloco, contatoBloco, rodape];
}

// ---------- Relatório dos setores (18h) ----------

const PAGINAS = [
  { nome: "Home", url: "https://alna.sale/" },
  { nome: "Atacado", url: "https://alna.sale/atacado" },
  { nome: "Loja", url: "https://store.alna.sale/loja" },
  { nome: "Carrinho", url: "https://store.alna.sale/carrinho" },
  { nome: "Checkout", url: "https://store.alna.sale/checkout" },
];

type Pagina = { nome: string; status: number | null; segundos: number | null };

// Tempo de resposta do servidor (não é o PageSpeed; serve de sinal de lentidão).
async function verificarPagina(p: { nome: string; url: string }): Promise<Pagina> {
  const inicio = Date.now();
  try {
    const r = await fetch(p.url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    return { nome: p.nome, status: r.status, segundos: (Date.now() - inicio) / 1000 };
  } catch {
    return { nome: p.nome, status: null, segundos: null };
  }
}

const dataHora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "nunca";
const diasDesde = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity);

function linhaVelocidade(p: Pagina): string {
  if (p.segundos === null || p.status !== 200) return `${p.nome}: FORA DO AR${p.status ? ` (erro ${p.status})` : ""}`;
  const s = segundosTexto(p.segundos);
  if (p.nome === "Home") {
    return p.segundos <= META_HOME_S
      ? `Home ${s}: dentro da meta (0,5 s)`
      : `Home ${s}: FORA da meta (0,5 s)`;
  }
  return p.segundos > ALERTA_S ? `${p.nome} ${s}: ⚠ acima de 2 s` : `${p.nome} ${s}: OK`;
}

async function relatorioSetores(admin: Admin, agora: Date): Promise<string[]> {
  const desde24h = new Date(agora.getTime() - DIA_MS).toISOString();
  const [resumoRes, paginas, tarefasRes] = await Promise.all([
    admin.rpc("auditoria_resumo"),
    Promise.all(PAGINAS.map(verificarPagina)),
    admin.from("agent_task").select("setor, titulo, status, atualizado_em, dono").order("atualizado_em", { ascending: false }).limit(300),
  ]);
  if (resumoRes.error) throw new Error(resumoRes.error.message);
  if (tarefasRes.error) throw new Error(tarefasRes.error.message);
  const resumo = (resumoRes.data ?? {}) as Record<string, string | number | null>;
  const tarefas = tarefasRes.data ?? [];

  // ---- 1. Auditoria e velocidade
  const noAr = paginas.filter((p) => p.status === 200).length;
  const ultimoPedido = resumo.ultimo_pedido_qualquer as string | null;
  const ultimoCarrinho = resumo.ultimo_carrinho_salvo as string | null;
  const ultimaTarefa = resumo.ultima_tarefa_agente as string | null;
  const falhas = Number(resumo.agendamentos_com_falha_24h ?? 0);
  const estoque100 = Number(resumo.variantes_estoque_100 ?? 0);
  const auditoria = [
    `**1. AUDITORIA E VELOCIDADE — ${dataDeHoje(agora)} (das ${hora(agora)})**`,
    `• Páginas no ar: ${noAr} de ${paginas.length}`,
    `• Velocidade (tempo de resposta do servidor; não é o PageSpeed): ${paginas.map(linhaVelocidade).join(" · ")}`,
    `• Pedidos: ${diasDesde(ultimoPedido) > 3 ? "⚠" : "OK"} último criado em ${dataHora(ultimoPedido)}`,
    `• Carrinhos salvos: ${diasDesde(ultimoCarrinho) > 3 ? "⚠" : "OK"} último em ${dataHora(ultimoCarrinho)}`,
    `• Agendamentos: ${falhas > 0 ? `⚠ ${falhas} falha(s) nas últimas 24 h` : "OK, nenhuma falha nas últimas 24 h"}`,
    `• Registro dos setores: ${diasDesde(ultimaTarefa) > 3 ? `⚠ sem registro desde ${dataHora(ultimaTarefa)}` : `OK, último em ${dataHora(ultimaTarefa)}`}`,
    `• Estoque: ${estoque100} variações com 100 unidades (aguardando o seu ok)`,
  ].join("\n");

  // ---- 2. O que cada setor fez nas últimas 24 h
  const feitas = tarefas.filter((t) => t.atualizado_em >= desde24h);
  const porSetor = new Map<string, string[]>();
  for (const t of feitas) {
    const lista = porSetor.get(t.setor) ?? [];
    lista.push(`${t.titulo} (${t.status})`);
    porSetor.set(t.setor, lista);
  }
  const setoresBloco = [
    "**2. O QUE CADA SETOR FEZ (últimas 24 h)**",
    ...(porSetor.size
      ? [...porSetor.entries()].map(([setor, lista]) => `• ${setor}: ${lista.join("; ")}`)
      : ["• Nenhum setor registrou tarefa nas últimas 24 h."]),
    "Aprendizados: o registro atual (agent_task) não guarda o que foi aprendido; isso fica no diário de cada setor.",
  ].join("\n");

  // ---- 3. Pendências (prioridade pela ordem: as mais recentes primeiro)
  const abertas = tarefas.filter((t) => STATUS_ABERTOS.includes(t.status));
  const cinco = abertas.slice(0, 5);
  const pendenciasBloco = [
    `**3. PENDÊNCIAS (${abertas.length} em aberto)**`,
    ...(cinco.length
      ? cinco.map((t, i) => `${i + 1}. [${t.setor}] ${t.titulo} — ${t.status}${t.dono ? ` · dono: ${t.dono}` : ""}`)
      : ["Nenhuma pendência registrada."]),
    abertas.length > 5 ? `…e mais ${abertas.length - 5}.` : "",
    "Responda pelo número do item. Nada foi publicado sem o seu ok.",
  ].filter((l) => l !== "").join("\n");

  return [auditoria, setoresBloco, pendenciasBloco];
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
