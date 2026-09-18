import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquarePlus, MessagesSquare, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

type Thread = { id: string; titre: string };

const transport = new DefaultChatTransport({ api: "/api/chat" });

function FenetreChat({ threadId }: { threadId: string }) {
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    transport,
  });

  const enCours = status === "submitted" || status === "streaming";

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="gap-4 p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Assistant Noticia"
              description="Posez vos questions sur le générateur, les formats, les thématiques ou la conformité des notices."
            />
          ) : (
            messages.map((m, i) => {
              const texte = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const dernierAssistantEnAttente =
                m.role === "assistant" && i === messages.length - 1 && status === "submitted";
              return (
                <Message key={m.id} from={m.role}>
                  <MessageContent>
                    {m.role === "assistant" ? (
                      dernierAssistantEnAttente && !texte ? (
                        <Shimmer className="text-sm">Réflexion en cours…</Shimmer>
                      ) : (
                        <MessageResponse>{texte}</MessageResponse>
                      )
                    ) : (
                      texte
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={async (message) => {
            if (!message.text.trim() || enCours) return;
            await sendMessage({ text: message.text.trim() });
          }}
        >
          <PromptInputTextarea
            placeholder="Votre question…"
            autoFocus
            className="max-h-32 min-h-10 text-sm"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              disabled={enCours ? false : undefined}
              onStop={stop}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

export function NoticiaChat() {
  const [ouvert, setOuvert] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([{ id: "fil-1", titre: "Conversation 1" }]);
  const [actif, setActif] = useState("fil-1");

  const compteur = useMemo(() => threads.length, [threads]);

  function nouvelleConversation() {
    const id = `fil-${Date.now()}`;
    setThreads((t) => [...t, { id, titre: `Conversation ${compteur + 1}` }]);
    setActif(id);
  }

  function supprimerConversation(id: string) {
    setThreads((t) => {
      const reste = t.filter((x) => x.id !== id);
      if (reste.length === 0) {
        const nouveau = { id: `fil-${Date.now()}`, titre: "Conversation 1" };
        setActif(nouveau.id);
        return [nouveau];
      }
      if (id === actif) setActif(reste[reste.length - 1].id);
      return reste;
    });
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir l'assistant"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
      >
        <MessagesSquare className="size-4" />
        Assistant
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-40 flex h-[min(640px,calc(100vh-3rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Assistant Noticia</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={nouvelleConversation}
            aria-label="Nouvelle conversation"
            title="Nouvelle conversation"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquarePlus className="size-4" />
          </button>
          <button
            onClick={() => setOuvert(false)}
            aria-label="Fermer l'assistant"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {threads.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                t.id === actif
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <button onClick={() => setActif(t.id)} className="max-w-28 truncate">
                {t.titre}
              </button>
              <button
                onClick={() => supprimerConversation(t.id)}
                aria-label={`Supprimer ${t.titre}`}
                className="text-muted-foreground/70 transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <FenetreChat key={actif} threadId={actif} />
    </aside>
  );
}
