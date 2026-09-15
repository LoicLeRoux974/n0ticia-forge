import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileText, Loader2, Copy, Check, AlertTriangle, Upload } from "lucide-react";

import { genererNotice, type NoticeResult } from "@/lib/noticia.functions";
import { FORMATS, INTENSITES, MODALITES, THEMATIQUES } from "@/lib/noticia-options";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Générateur de fiche Noticia — notices de formation Réseau Canopé" },
      {
        name: "description",
        content:
          "Déposez le programme PDF d'une formation et obtenez une notice Noticia conforme au Vadémécum 4 : titre, accroche, descriptif, objectifs Bloom.",
      },
      { property: "og:title", content: "Générateur de fiche Noticia" },
      {
        property: "og:description",
        content:
          "Générez automatiquement une notice de formation Noticia conforme au Vadémécum 4 à partir d'un document PDF.",
      },
    ],
  }),
  component: Index,
});

const LIMITES = { titre: 150, titreCourt: 80, accroche: 150, descriptif: 300 };

function Compteur({ valeur, limite }: { valeur: string; limite: number }) {
  const n = valeur.length;
  const ok = n <= limite;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${ok ? "text-muted-foreground" : "text-destructive"}`}
    >
      {n} / {limite} signes
    </span>
  );
}

function Bloc({
  titre,
  children,
  compteur,
}: {
  titre: string;
  children: React.ReactNode;
  compteur?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{titre}</h3>
        {compteur}
      </div>
      <div className="mt-2 text-[0.95rem] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function Champ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        <option value="">L'assistant décide</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function noticeEnTexte(n: NoticeResult) {
  const lignes = [
    "NOTICE DE FORMATION NOTICIA",
    "",
    `TITRE\n${n.titre}`,
    `THÉMATIQUE\n${n.thematique}${n.sousThematique ? ` > ${n.sousThematique}` : ""}`,
    `FORMAT\n${n.format}`,
    `INTENSITÉ\n${n.intensite}`,
    `MODALITÉ\n${n.modalite}`,
    `ACCROCHE COMMERCIALE\n${n.accroche}`,
    `DESCRIPTIF\n${n.descriptif}`,
    `OBJECTIFS PÉDAGOGIQUES\nÀ l'issue de la formation, le stagiaire sera en capacité de :\n${n.objectifs
      .map((o) => `• ${o}`)
      .join("\n")}`,
    `PUBLIC CIBLÉ\n${n.publics.join(", ")}`,
    `PRÉREQUIS\n${n.prerequis || "Aucun"}`,
  ];
  if (n.evaluation) lignes.push(`MODALITÉS D'ÉVALUATION\n${n.evaluation}`);
  return lignes.join("\n\n");
}

function Index() {
  const appeler = useServerFn(genererNotice);
  const inputRef = useRef<HTMLInputElement>(null);

  const [fichier, setFichier] = useState<{ name: string; data: string } | null>(null);
  const [texte, setTexte] = useState("");
  const [format, setFormat] = useState("");
  const [intensite, setIntensite] = useState("");
  const [modalite, setModalite] = useState("");
  const [thematique, setThematique] = useState("");
  const [erreurFichier, setErreurFichier] = useState("");
  const [copie, setCopie] = useState(false);

  const mutation = useMutation({
    mutationFn: async () =>
      appeler({
        data: {
          fileName: fichier?.name,
          fileData: fichier?.data,
          texte,
          format,
          intensite,
          modalite,
          thematique,
        },
      }),
  });

  const notice = mutation.data;

  async function choisirFichier(f: File | undefined) {
    setErreurFichier("");
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErreurFichier("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErreurFichier("Le document dépasse 10 Mo.");
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Lecture impossible"));
      reader.readAsDataURL(f);
    });
    setFichier({ name: f.name, data });
  }

  function copier() {
    if (!notice) return;
    navigator.clipboard.writeText(noticeEnTexte(notice));
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground/70">
            R3SEAU CANOP3 · N0TICIA & VAD3M3CUM 4
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Générateur de fiche N0ticia
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Déposez le programme d'une formation au format PDF.&nbsp;
            <br />
            L'assistant rédige une notice complète conforme aux spécifications N0ticia : titre, accroche, descriptif, objectifs pédagogiques et prérequis.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void choisirFichier(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-ring"
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => void choisirFichier(e.target.files?.[0])}
            />
            {fichier ? (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <FileText className="size-4 text-primary" />
                {fichier.name}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto size-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Déposez le document PDF de votre proposition (programme, grandes idées...)
                </p>
                <p className="text-xs text-muted-foreground">ou cliquez pour parcourir (10 Mo max)</p>
              </div>
            )}
          </div>
          {erreurFichier && <p className="text-sm text-destructive">{erreurFichier}</p>}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Informations complémentaires (facultatif)
            </span>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={4}
              placeholder="Durée, public visé, contexte, précisions à intégrer…"
              className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Format" value={format} onChange={setFormat} options={FORMATS} />
            <Champ
              label="Intensité"
              value={intensite}
              onChange={setIntensite}
              options={INTENSITES}
            />
            <Champ label="Modalité" value={modalite} onChange={setModalite} options={MODALITES} />
            <Champ
              label="Thématique"
              value={thematique}
              onChange={setThematique}
              options={THEMATIQUES}
            />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!fichier && !texte.trim())}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {mutation.isPending ? "Rédaction en cours…" : "Générer la notice"}
          </button>

          {mutation.isError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(mutation.error as Error).message}
            </p>
          )}
        </section>

        <section>
          {!notice && !mutation.isPending && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              La notice générée s'affichera ici, avec le décompte des signes pour chaque champ.
            </div>
          )}

          {mutation.isPending && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Analyse du document et rédaction…
            </div>
          )}

          {notice && (
            <article className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <h2 className="text-lg font-semibold">Notice de formation Noticia</h2>
                <button
                  onClick={copier}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {copie ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copie ? "Copié" : "Copier"}
                </button>
              </div>

              <Bloc
                titre="Titre"
                compteur={<Compteur valeur={notice.titre} limite={LIMITES.titre} />}
              >
                <p className="font-display text-xl">{notice.titre}</p>
                {notice.titre.length > LIMITES.titreCourt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dépasse 80 signes : non compatible CanoTech.
                  </p>
                )}
                {notice.variantesTitre.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {notice.variantesTitre.map((v) => (
                      <li key={v}>Variante : {v}</li>
                    ))}
                  </ul>
                )}
              </Bloc>

              <div className="grid gap-x-8 sm:grid-cols-2">
                <Bloc titre="Thématique">
                  {notice.thematique}
                  {notice.sousThematique ? ` > ${notice.sousThematique}` : ""}
                </Bloc>
                <Bloc titre="Format">{notice.format}</Bloc>
                <Bloc titre="Intensité">{notice.intensite}</Bloc>
                <Bloc titre="Modalité">{notice.modalite}</Bloc>
              </div>

              <Bloc
                titre="Accroche commerciale"
                compteur={<Compteur valeur={notice.accroche} limite={LIMITES.accroche} />}
              >
                {notice.accroche}
              </Bloc>

              <Bloc
                titre="Descriptif"
                compteur={<Compteur valeur={notice.descriptif} limite={LIMITES.descriptif} />}
              >
                {notice.descriptif}
              </Bloc>

              <Bloc titre="Objectifs pédagogiques">
                <p className="text-sm text-muted-foreground">
                  À l'issue de la formation, le stagiaire sera en capacité de :
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {notice.objectifs.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </Bloc>

              <Bloc titre="Public ciblé">{notice.publics.join(", ")}</Bloc>
              <Bloc titre="Prérequis">{notice.prerequis || "Aucun"}</Bloc>
              {notice.evaluation && (
                <Bloc titre="Modalités d'évaluation (Qualiopi)">{notice.evaluation}</Bloc>
              )}

              {notice.alertes.length > 0 && (
                <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="size-4" /> Points de vigilance
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {notice.alertes.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
