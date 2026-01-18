import {
  Component,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  inject,
  OnDestroy,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import { TeamService } from '../../core/services/team.service';
import { AiService } from '../../core/services/ai.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Mesma chave usada no chatbot flutuante
const STORAGE_KEY = 'hubi_chat_history';
const MAX_STORED_MESSAGES = 50;

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, MarkdownComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('inputField') private inputField!: ElementRef<HTMLTextAreaElement>;

  private teamService = inject(TeamService);
  private aiService = inject(AiService);
  private chatSubscription: Subscription | null = null;

  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  showScrollButton = signal(false);
  inputMessage = '';

  private shouldScroll = false;
  private userScrolledUp = false;

  constructor() {
    // Salva no localStorage quando mensagens mudam
    effect(() => {
      const msgs = this.messages();
      const teamId = this.teamService.currentTeam()?.id;
      if (teamId && msgs.length > 0) {
        this.saveToStorage(teamId, msgs);
      }
    });
  }

  ngOnInit(): void {
    this.loadFromStorage();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
    this.autoResizeTextarea();
  }

  ngOnDestroy(): void {
    this.chatSubscription?.unsubscribe();
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();
    if (!message || this.isLoading()) return;

    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMessage]);
    this.inputMessage = '';
    this.shouldScroll = true;
    this.userScrolledUp = false; // Reset quando envia nova mensagem
    this.isLoading.set(true);
    this.resetTextareaHeight();

    // Create empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, assistantMessage]);

    // Cancel previous subscription
    this.chatSubscription?.unsubscribe();

    // Call API with streaming
    let accumulatedContent = '';

    this.chatSubscription = this.aiService.chat(teamId, message).subscribe({
      next: (chunk) => {
        if (chunk.error) {
          this.updateLastMessage('Desculpe, ocorreu um erro. Tente novamente.');
          return;
        }
        accumulatedContent += chunk.content;
        this.updateLastMessage(accumulatedContent);
        // Só faz auto-scroll se o usuário não rolou para cima
        if (!this.userScrolledUp) {
          this.shouldScroll = true;
        }
      },
      error: () => {
        this.updateLastMessage(
          'Desculpe, não foi possível conectar ao assistente. Verifique se o serviço está disponível.'
        );
        this.isLoading.set(false);
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  sendSuggestion(text: string): void {
    this.inputMessage = text;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      localStorage.removeItem(this.getStorageKey(teamId));
    }
    this.messages.set([]);
  }

  onMessagesScroll(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      const threshold = 100;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
      this.showScrollButton.set(!isNearBottom);
      this.userScrolledUp = !isNearBottom;
    }
  }

  scrollToBottomClick(): void {
    this.scrollToBottom();
    this.showScrollButton.set(false);
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

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  private autoResizeTextarea(): void {
    if (this.inputField) {
      const textarea = this.inputField.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }

  private resetTextareaHeight(): void {
    if (this.inputField) {
      this.inputField.nativeElement.style.height = 'auto';
    }
  }

  private getStorageKey(teamId: string): string {
    return `${STORAGE_KEY}_${teamId}`;
  }

  private loadFromStorage(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    const stored = localStorage.getItem(this.getStorageKey(teamId));
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      const messages = parsed.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      this.messages.set(messages);
      this.shouldScroll = true;
    }
  }

  private saveToStorage(teamId: string, messages: ChatMessage[]): void {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(this.getStorageKey(teamId), JSON.stringify(toStore));
  }
}
