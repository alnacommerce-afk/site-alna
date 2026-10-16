-- Origem do carrinho salvo: 'caixa' (box Salve seu carrinho) ou 'automatico' (salvamento automatico).
-- Coluna opcional: carrinhos antigos ficam sem origem (NULL). Nada e apagado.
ALTER TABLE public.abandoned_carts ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('caixa', 'automatico'));
