# Ativos visuais — origem e cuidados

## Banner do topo da /loja — `src/assets/brand/hero-ambassador-cutout.png`
- **O que é:** a embaixadora oficial da marca (modelo UGC) recortada ("cutout") sobre o topo da `/loja`. Entrou em 24/09/2026 (commit 2adda3f, "Use the real brand ambassador in the /loja banner, with an organic cutout").
- **Como foi feita:** a imagem foi **gerada/editada com IA nesta mesma frente de trabalho** (o dono confirma, 09/10/2026: "a imagem foi feita aqui, demos a instrução para criar"), a partir da **foto de referência oficial** `brand-reference/embaixadora-oficial.png` (regra da memória `feedback_banner_model_identity`: sempre partir da foto real, nunca de uma geração anterior; nada pode cobrir o rosto).
  O arquivo original trazia credenciais de conteúdo (C2PA) assinadas pela ferramenta geradora (Eleven Labs / fal.ai), com `digitalSourceType = trainedAlgorithmicMedia` / `compositeWithTrainedAlgorithmicMedia`.
- **Rótulo de IA mantido:** em 09/10/2026 o PNG foi compactado sem perda (590 → 231 KB, mesmos pixels, 1344×752). O bloco C2PA (356 KB) foi retirado e substituído por um rótulo IPTC leve (XMP `Iptc4xmpExt:DigitalSourceType = compositeWithTrainedAlgorithmicMedia`, 440 bytes).
  Isso **não** influencia indexação/ranking (nenhuma fonte do Google diz isso); é transparência. O original com a credencial completa está no git: `git show 9b7cb01^:src/assets/brand/hero-ambassador-cutout.png > hero-original.png`.
- **Não mudar:** formato (PNG), posição, zoom e aparência; **não converter para WebP** (decisão do dono, 08/10).
- **Medida de referência:** 1344×752, 230.857 bytes. PageSpeed celular da `/loja` antes da compactação: 70–81 (medir de novo 3 vezes após publicar).

## Outras imagens da pasta `src/assets/brand/`
`banner-frete-gratis.webp`, `banner-mesa.webp`, `banner-quarto.webp`, `hero-setembro-face.webp` (banners antigos), `logo-alna.png` (logotipo). Se alguma for gerada/editada com IA, registrar aqui a origem.
