import { useEffect, useState } from "react";
import { Pencil, Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STARS = [5, 4, 3, 2, 1] as const;
type Counts = Record<(typeof STARS)[number], number>;

const emptyCounts: Counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function summarize(counts: Counts) {
  const total = STARS.reduce((sum, s) => sum + counts[s], 0);
  const average = total === 0 ? 0 : STARS.reduce((sum, s) => sum + s * counts[s], 0) / total;
  return { total, average };
}

// The Google Business Profile has no free API for the per-star breakdown, so the five counts are
// typed in here (Edit button) from the profile's "Resumo de avaliações" box.
export function GoogleRatingsCard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("google_review_stats")
      .select("star_1, star_2, star_3, star_4, star_5")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => {
        setCounts(
          data
            ? { 1: data.star_1, 2: data.star_2, 3: data.star_3, 4: data.star_4, 5: data.star_5 }
            : emptyCounts,
        );
      });
  }, []);

  function openEdit() {
    const current = counts ?? emptyCounts;
    setDraft(Object.fromEntries(STARS.map((s) => [s, String(current[s])])));
    setEditing(true);
  }

  async function save() {
    const next = { ...emptyCounts };
    for (const s of STARS) {
      const value = Number(draft[s]);
      if (!Number.isInteger(value) || value < 0) {
        toast.error("Use apenas números inteiros, de zero para cima.");
        return;
      }
      next[s] = value;
    }
    setSaving(true);
    const { error } = await supabase.from("google_review_stats").upsert({
      id: "default",
      star_1: next[1],
      star_2: next[2],
      star_3: next[3],
      star_4: next[4],
      star_5: next[5],
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar as notas do Google.");
      return;
    }
    setCounts(next);
    setEditing(false);
    toast.success("Notas do Google atualizadas.");
  }

  const shown = counts ?? emptyCounts;
  const { total, average } = summarize(shown);
  const max = Math.max(1, ...STARS.map((s) => shown[s]));
  const roundedStars = Math.round(average);

  return (
    <div className="w-full max-w-sm rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notas do Google
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Editar notas do Google"
          onClick={openEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1">
          {STARS.map((s) => (
            <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2">{s}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: `${(shown[s] / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-4xl font-light text-[#12294f]">
            {total === 0 ? "—" : average.toFixed(1).replace(".", ",")}
          </p>
          <div className="mt-1 flex justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-3.5 w-3.5 ${
                  n <= roundedStars && total > 0
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-[#16a34a]">
            {total} {total === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar notas do Google</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Digite quantas avaliações o perfil tem em cada estrela (veja o "Resumo de avaliações" do
            perfil no Google). A média e o total são calculados sozinhos.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {STARS.map((s) => (
              <div key={s} className="space-y-1">
                <Label htmlFor={`google-star-${s}`}>{s} ★</Label>
                <Input
                  id={`google-star-${s}`}
                  type="number"
                  min={0}
                  value={draft[s] ?? "0"}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [s]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
