import {
  Component,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import { TeamService } from '../../core/services/team.service';
import { ChatService } from '../../core/services/chat.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
  chatService = inject(ChatService);
  private chatSubscription: Subscription | null = null;

  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  showScrollButton = signal(false);
  sidebarCollapsed = signal(false);
  inputMessage = '';

  private shouldScroll = false;
  private userScrolledUp = false;

  ngOnInit(): void {
    this.loadSessions();
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

  private loadSessions(): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (teamId) {
      this.chatService.loadSessions(teamId).subscribe();
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  startNewChat(): void {
    this.chatService.startNewChat();
    this.messages.set([]);
  }

  loadSession(sessionId: string): void {
    const teamId = this.teamService.currentTeam()?.id;
    if (!teamId) return;

    this.chatService.loadSessionMessages(teamId, sessionId).subscribe({
      next: (response) => {
        const msgs: ChatMessage[] = response
          .filter((m) => m.role !== 'SYSTEM')
          .map((m) => ({
            id: m.id,
            role: m.role.toLowerCase() as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
        this.messages.set(msgs);
        this.shouldScroll = true;
      },
      error: () => {
        // Em caso de erro, apenas seleciona a sessão
        this.chatService.currentSessionId.set(sessionId);
        this.messages.set([]);
      },
    });
  }

  formatSessionDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
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
    this.userScrolledUp = false;
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
    const currentSessionId = this.chatService.currentSessionId() || undefined;
    let newSessionId: string | null = null;

    this.chatSubscription = this.chatService
      .sendMessageStream(teamId, message, currentSessionId)
      .subscribe({
        next: (chunk) => {
          if (chunk.error) {
            this.updateLastMessage('Desculpe, ocorreu um erro. Tente novamente.');
            return;
          }

          // Captura sessionId da primeira resposta
          if (chunk.sessionId && !newSessionId) {
            newSessionId = chunk.sessionId;
            this.chatService.currentSessionId.set(newSessionId);

            // Adiciona à lista de sessões se for nova
            if (!currentSessionId) {
              this.chatService.addSession({
                id: newSessionId,
                title: message.substring(0, 50),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }

          accumulatedContent += chunk.content;
          this.updateLastMessage(accumulatedContent);

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

  onMessagesScroll(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      const threshold = 100;
      const isNearBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
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
        behavior: 'smooth',
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
}
