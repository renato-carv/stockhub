import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatSession {
  id: string;
  title: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIStreamChunk {
  sessionId: string;
  content: string;
  done: boolean;
  error?: string;
}

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = environment.apiUrl;

  // Estado das sessões
  sessions = signal<ChatSession[]>([]);
  currentSessionId = signal<string | null>(null);
  isLoadingSessions = signal(false);
  isLoadingMessages = signal(false);

  /**
   * Carrega todas as sessões de chat do usuário
   */
  loadSessions(teamId: string): Observable<ChatSession[]> {
    this.isLoadingSessions.set(true);

    return new Observable((subscriber) => {
      fetch(`${this.apiUrl}/teams/${teamId}/chat/sessions?limit=50`, {
        method: 'GET',
        credentials: 'include',
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          // Backend retorna array direto
          const sessions = Array.isArray(data) ? data : (data.data || []);
          this.sessions.set(sessions);
          this.isLoadingSessions.set(false);
          subscriber.next(sessions);
          subscriber.complete();
        })
        .catch((err) => {
          console.error('Erro ao carregar sessões:', err);
          this.isLoadingSessions.set(false);
          subscriber.error(err);
        });
    });
  }

  /**
   * Carrega mensagens de uma sessão específica
   */
  loadSessionMessages(teamId: string, sessionId: string): Observable<ChatMessageResponse[]> {
    this.isLoadingMessages.set(true);

    return new Observable((subscriber) => {
      fetch(`${this.apiUrl}/teams/${teamId}/chat/sessions/${sessionId}/messages?limit=100`, {
        method: 'GET',
        credentials: 'include',
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          const messages = Array.isArray(data) ? data : (data.data || []);
          this.currentSessionId.set(sessionId);
          this.isLoadingMessages.set(false);
          subscriber.next(messages);
          subscriber.complete();
        })
        .catch((err) => {
          console.error('Erro ao carregar mensagens:', err);
          this.isLoadingMessages.set(false);
          subscriber.error(err);
        });
    });
  }

  /**
   * Envia mensagem com streaming (cria sessão se não existir)
   */
  sendMessageStream(teamId: string, message: string, sessionId?: string): Observable<AIStreamChunk> {
    return new Observable((subscriber) => {
      const controller = new AbortController();

      fetch(`${this.apiUrl}/teams/${teamId}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sessionId: sessionId || undefined,
          stream: true,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No reader available');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) as AIStreamChunk;

                  // Atualiza sessionId se for nova sessão
                  if (data.sessionId && !this.currentSessionId()) {
                    this.currentSessionId.set(data.sessionId);
                  }

                  subscriber.next(data);
                } catch {
                  // Ignora linhas inválidas
                }
              }
            }
          }

          subscriber.complete();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            subscriber.error(err);
          }
        });

      return () => controller.abort();
    });
  }

  /**
   * Inicia uma nova conversa
   */
  startNewChat(): void {
    this.currentSessionId.set(null);
  }

  /**
   * Adiciona uma sessão à lista (após primeira mensagem)
   */
  addSession(session: ChatSession): void {
    this.sessions.update((sessions) => [session, ...sessions]);
  }

  /**
   * Exclui uma sessão de chat
   */
  deleteSession(teamId: string, sessionId: string): Observable<void> {
    return new Observable((subscriber) => {
      fetch(`${this.apiUrl}/teams/${teamId}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          // Remove da lista local
          this.sessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
          // Se era a sessão atual, limpa
          if (this.currentSessionId() === sessionId) {
            this.currentSessionId.set(null);
          }
          subscriber.next();
          subscriber.complete();
        })
        .catch((err) => {
          console.error('Erro ao excluir sessão:', err);
          subscriber.error(err);
        });
    });
  }
}
