// Référentiels Noticia injectés dans chaque génération de fiche et dans l'Assistant.
// Source unique : TOUS les fichiers .md du dossier public/.
// Ajoutez un fichier .md dans public/, il est lu et transmis à l'IA automatiquement.
const fichiers = import.meta.glob("../../public/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type Referentiel = {
  nom: string;
  texte: string;
};

// Un référentiel par fichier .md non vide, classé par nom de fichier.
export const REFERENTIELS: Referentiel[] = Object.entries(fichiers)
  .map(([chemin, texte]) => ({
    nom: chemin.split("/").pop() ?? chemin,
    texte: String(texte ?? "").trim(),
  }))
  .filter((referentiel) => referentiel.texte.length > 0)
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

// Texte consolidé de tous les référentiels, prêt à être injecté dans la requête.
export const REFERENTIELS_TEXT: string = REFERENTIELS.map(
  (referentiel) => `=== ${referentiel.nom} ===\n${referentiel.texte}`,
).join("\n\n---\n\n");
