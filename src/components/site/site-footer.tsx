import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import logoAlnaTransparent from "@/assets/brand/logo-alna.png";
import { WHATSAPP_URL } from "@/components/site/whatsapp-float-button";

type CategoryLink = { id: string; name: string; slug: string };
type Settings = {
  cnpj: string | null;
  razao_social: string | null;
  phone: string | null;
  email: string | null;
  instagram_handle: string | null;
  address_city: string | null;
  address_state: string | null;
  business_hours: string | null;
};

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [categories, setCategories] = useState<CategoryLink[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("position")
      .then(({ data }) => setCategories(data ?? []));

    supabase
      .from("site_settings")
      .select(
        "cnpj, razao_social, phone, email, instagram_handle, address_city, address_state, business_hours",
      )
      .eq("id", "default")
      .single()
      .then(({ data }) => setSettings(data));
  }, []);

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
          <img src={logoAlnaTransparent} alt="Alna Commerce" className="h-12 w-auto" />
          <p className="mt-3 text-sm text-white/70">
            Utensílios de madeira para cozinha e itens de cama, mesa e banho que trazem
            praticidade e bem-estar para sua casa.
          </p>
          <p className="mt-4 text-xs text-white/50">CNPJ: {settings?.cnpj ?? "57.135.009/0001-27"}</p>
          <p className="text-xs text-white/50">
            Razão Social: {settings?.razao_social ?? "ALNA COMMERCE"}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">
            Institucional
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link to="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link to="/loja" search={{ categoria: undefined }} className="hover:text-white">
                Loja
              </Link>
            </li>
            <li>
              <a href="/#sobre" className="hover:text-white">
                Sobre
              </a>
            </li>
            <li>
              <a href="/#fale-conosco" className="hover:text-white">
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
            {categories.length === 0 ? (
              <li className="text-white/40">Em breve</li>
            ) : (
              categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to="/loja"
                    search={{ categoria: category.slug }}
                    className="hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))
            )}
          </ul>

          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-white/90">
            Políticas
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link to="/politica-de-privacidade" className="hover:text-white">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos-de-uso" className="hover:text-white">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link to="/politica-de-troca-e-devolucao" className="hover:text-white">
                Trocas e Devoluções
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/90">
            Atendimento
          </h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> {settings?.phone ?? "(51) 99491-1125"}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> {settings?.email ?? "contato@alna.cc"}
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-4 w-4 shrink-0" /> @
              {settings?.instagram_handle ?? "alnaoficial_"}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />{" "}
              {settings
                ? `${settings.address_city}, ${settings.address_state}`
                : "Brusque, Santa Catarina"}
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {settings?.business_hours ??
                  "Segunda a Sexta: 8h às 18h | Sábado: 8h às 12h"}
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
