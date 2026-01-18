import { Component, signal, ElementRef, ViewChild, AfterViewChecked, inject, computed, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TeamService } from '../../../core/services/team.service';
import { AiService } from '../../../core/services/ai.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = 'hubi_chat_history';
const MAX_STORED_MESSAGES = 50;

@Component({
  selector: 'app-chatbot',
  imports: [CommonModule, FormsModule, MarkdownComponent],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private authService = inject(AuthService);
  private teamService = inject(TeamService);
  private aiService = inject(AiService);
  private chatSubscription: Subscription | null = null;

  shouldShow = computed(() => {
    return this.authService.isAuthenticated() && !!this.teamService.currentTeam();
  });

  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  inputMessage = '';

  private shouldScroll = false;

  constructor() {
    effect(() => {
      const msgs = this.messages();
      const teamId = this.teamService.currentTeam()?.id;
      if (teamId && msgs.length > 0) {
        this.saveToStorage(teamId, msgs);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat(): void {
    this.isOpen.update((open) => !open);

    if (this.isOpen() && this.messages().length === 0) {
      this.loadFromStorage();
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();
    if (!message || this.isLoading()) return;

    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    // Adiciona mensagem do usuário
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMessage]);
    this.inputMessage = '';
    this.shouldScroll = true;
    this.isLoading.set(true);

    // Cria mensagem do assistente vazia para streaming
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, assistantMessage]);

    // Cancela subscription anterior se existir
    this.chatSubscription?.unsubscribe();

    // Chama a API com streaming
    let accumulatedContent = '';

    this.chatSubscription = this.aiService.chat(teamId, message).subscribe({
      next: (chunk) => {
        if (chunk.error) {
          this.updateLastMessage('Desculpe, ocorreu um erro. Tente novamente.');
          return;
        }
        // Acumula o conteúdo conforme chega
        accumulatedContent += chunk.content;
        this.updateLastMessage(accumulatedContent);
        this.shouldScroll = true;
      },
      error: () => {
        this.updateLastMessage('Desculpe, não foi possível conectar ao assistente. Verifique se o serviço está disponível.');
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  private updateLastMessage(content: string): void {
    this.messages.update((msgs) => {
      const updated = [...msgs];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content,
        };
      }
      return updated;
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Olá! Sou o Hubi, seu assistente de estoque. Posso ajudar você com informações sobre produtos, movimentações e relatórios. Como posso ajudar?',
      timestamp: new Date(),
    };

    this.messages.set([welcomeMessage]);
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private getStorageKey(teamId: string): string {
    return `${STORAGE_KEY}_${teamId}`;
  }

  private loadFromStorage(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) {
      this.addWelcomeMessage();
      return;
    }

    const stored = localStorage.getItem(this.getStorageKey(teamId));
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      const messages = parsed.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      this.messages.set(messages);
      this.shouldScroll = true;
    } else {
      this.addWelcomeMessage();
    }
  }

  private saveToStorage(teamId: string, messages: ChatMessage[]): void {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(this.getStorageKey(teamId), JSON.stringify(toStore));
  }

  clearChat(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      localStorage.removeItem(this.getStorageKey(teamId));
    }
    this.messages.set([]);
    this.addWelcomeMessage();
  }
}
