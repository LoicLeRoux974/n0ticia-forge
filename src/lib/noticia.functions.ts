import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  fileName: z.string().optional(),
  fileData: z.string().optional(), // data URL base64
  mimeType: z.string().optional(),
  texte: z.string().optional(),
  format: z.string().optional(),
  intensite: z.string().optional(),
  modalite: z.string().optional(),
  thematique: z.string().optional(),
  consignes: z.string().optional(),
});

export type NoticeResult = {
  titre: string;
  variantesTitre: string[];
  thematique: string;
  sousThematique: string;
  format: string;
  intensite: string;
  modalite: string;
  accroche: string;
  descriptif: string;
  objectifs: string[];
  publics: string[];
  prerequis: string;
  evaluation: string;
  alertes: string[];
};

const OUTPUT_INSTRUCTIONS = `Tu dois répondre UNIQUEMENT par un objet json valide, sans texte autour, sans balises de code, au format suivant :
{
  "titre": "titre principal retenu, conforme aux règles du titre",
  "variantesTitre": ["variante 1", "variante 2"],
  "thematique": "une des 9 thématiques Canopé",
  "sousThematique": "sous-thématique ou chaîne vide",
  "format": "un des 8 formats Noticia",
  "intensite": "Initiation | Perfectionnement | Professionnalisation/Expertise | Certification",
  "modalite": "En présence | À distance | En présence et à distance",
  "accroche": "accroche commerciale, 150 signes max",
  "descriptif": "descriptif, 300 signes max, présent de l'indicatif",
  "objectifs": ["objectif 1 (verbe Bloom à l'infinitif)", "objectif 2"],
  "publics": ["public Noticia"],
  "prerequis": "prérequis vérifiables, ou 'Aucun'",
  "evaluation": "dispositif d'évaluation Qualiopi si intensité Certification ou perfectionnement financé, sinon chaîne vide",
  "alertes": ["point de vigilance ou information manquante dans le document source"]
}
Règles impératives : respecter toutes les limites de caractères, aucun emoji, aucun sigle non explicité dans le titre et l'accroche. Si une information est absente du document, surtout ne pas inventer et signale-la dans "alertes".`;

/**
 * Normalise un texte de référence (prompt système, vadémécum) avant injection :
 * - Unicode NFC (accents décomposés -> forme composée)
 * - apostrophes et guillemets typographiques -> caractères ASCII droits
 * - suppression des caractères de contrôle et des accents graves isolés
 * Évite qu'un caractère spécial corrompe la requête envoyée au modèle.
 */
export function normaliserTexteReference(texte: string): string {
  return texte
    .normalize("NFC")
    .replace(/[’‘‛]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/`/g, "'");
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Réponse illisible du modèle");
  }
}

export const genererNotice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<NoticeResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Clé d'accès à l'IA manquante.");

    const { NOTICIA_SYSTEM_PROMPT } = await import("./noticia-prompt.server");
    const { VADEMECUM_TEXT } = await import("./vademecum.server");

    if (!data.fileData && !data.texte?.trim()) {
      throw new Error("Ajoutez un document PDF ou un texte descriptif.");
    }

    const contraintes = [
      data.format ? `Format imposé : ${data.format}` : null,
      data.intensite ? `Intensité imposée : ${data.intensite}` : null,
      data.modalite ? `Modalité imposée : ${data.modalite}` : null,
      data.thematique ? `Thématique imposée : ${data.thematique}` : null,
      data.consignes ? `Consignes complémentaires : ${data.consignes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Génère la notice Noticia complète à partir du document de formation fourni.
${contraintes ? `\n${contraintes}\n` : ""}
${data.texte?.trim() ? `\nInformations complémentaires fournies :\n${data.texte.trim()}\n` : ""}
${OUTPUT_INSTRUCTIONS}`,
      },
    ];

    if (data.fileData) {
      content.push({
        type: "file",
        file: {
          filename: data.fileName || "document.pdf",
          file_data: data.fileData,
        },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content: `${normaliserTexteReference(NOTICIA_SYSTEM_PROMPT)}\n\n---\n\nEXTRAIT DU VADÉMÉCUM 4 (référence réglementaire) :\n\n${normaliserTexteReference(VADEMECUM_TEXT)}`,
          },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Trop de demandes simultanées. Réessayez dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés pour cet espace de travail.");
      throw new Error(`Échec de la génération (${res.status}) : ${body.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(raw) as Partial<NoticeResult>;

    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

    return {
      titre: String(parsed.titre ?? ""),
      variantesTitre: asArray(parsed.variantesTitre),
      thematique: String(parsed.thematique ?? ""),
      sousThematique: String(parsed.sousThematique ?? ""),
      format: String(parsed.format ?? ""),
      intensite: String(parsed.intensite ?? ""),
      modalite: String(parsed.modalite ?? ""),
      accroche: String(parsed.accroche ?? ""),
      descriptif: String(parsed.descriptif ?? ""),
      objectifs: asArray(parsed.objectifs),
      publics: asArray(parsed.publics),
      prerequis: String(parsed.prerequis ?? ""),
      evaluation: String(parsed.evaluation ?? ""),
      alertes: asArray(parsed.alertes),
    };
  });
