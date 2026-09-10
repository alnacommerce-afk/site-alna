import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";

import { WHATSAPP_URL } from "@/components/site/whatsapp-float-button";

const CATEGORY_LINKS = [
  { label: "Cozinha", href: "#categorias" },
  { label: "Louça e Artigos para Servir", href: "#categorias" },
  { label: "Utensílios de Preparação", href: "#categorias" },
  { label: "Toalhas e Roupões", href: "#categorias" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#12294f] text-white">
      <div className="border-b border-white/10 bg-[#16a34a]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-medium">
            Dúvidas ou precisa de ajuda? Fale com a nossa equipe!
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#16a34a] transition-colors hover:bg-white/90"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-2xl font-black italic tracking-tight">ALNA</span>
          <p className="mt-3 text-sm text-white/70">
            Utensílios de madeira para cozinha e itens de cama, mesa e banho que trazem
            praticidade e bem-estar para sua casa.
          </p>
          <p className="mt-4 text-xs text-white/50">CNPJ: 57.135.009/0001-27</p>
          <p className="text-xs text-white/50">Razão Social: ALNA COMMERCE</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">
            Institucional
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <a href="/" className="hover:text-white">
                Home
              </a>
            </li>
            <li>
              <a href="#destaques" className="hover:text-white">
                Loja
              </a>
            </li>
            <li>
              <a href="#sobre" className="hover:text-white">
                Sobre
              </a>
            </li>
            <li>
              <a href="#fale-conosco" className="hover:text-white">
                Contato
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">
            Categorias
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            {CATEGORY_LINKS.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="hover:text-white">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">
            Atendimento
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> (51) 99491-1125
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> contato@alna.cc
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" /> @alnaoficial_
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> Brusque, Santa Catarina
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Segunda a Sexta: 8h às 18h
                <br />
                Sábado: 8h às 12h
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        Copyright © {year} Alna Commerce
      </div>
    </footer>
  );
}
