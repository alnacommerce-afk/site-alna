import type { CSSProperties, ReactNode } from "react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFloatButton } from "@/components/site/whatsapp-float-button";

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <section className="bg-[#12294f] py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          {updatedAt ? (
            <p className="mt-2 text-sm text-white/70">Última atualização: {updatedAt}</p>
          ) : null}
        </div>
      </section>
      <article className="mx-auto max-w-3xl px-4 py-12">{children}</article>
      <SiteFooter />
      <WhatsappFloatButton />
    </div>
  );
}

// `order` (optional) turns on the gentle block-by-block entrance used by the ad landing page: block 0 is
// visible at once (it is what the visitor came for), later blocks fade in with a very short stagger and
// the browser skips drawing the ones far below the screen until they get close (content-visibility).
export function LegalSection({
  heading,
  children,
  order,
}: {
  heading: string;
  children: ReactNode;
  order?: number;
}) {
  if (order !== undefined) {
    const style = { "--reveal-delay": `${Math.min(order, 3) * 60}ms` } as CSSProperties;
    return (
      <div
        className={`${order > 0 ? "reveal-soft" : ""} ${order >= 2 ? "defer-render" : ""} mt-8 first:mt-0`}
        style={style}
      >
        <section>
          <h2 className="text-xl font-bold text-[#12294f]">{heading}</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </section>
      </div>
    );
  }
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-xl font-bold text-[#12294f]">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
