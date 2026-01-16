import { Component, signal, ElementRef, ViewChild, AfterViewChecked, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TeamService } from '../../../core/services/team.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private authService = inject(AuthService);
  private teamService = inject(TeamService);

  // Only show chatbot when user is logged in and has a team selected
  shouldShow = computed(() => {
    return this.authService.isAuthenticated() && !!this.teamService.currentTeam();
  });

  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  inputMessage = '';

  private shouldScroll = false;

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat(): void {
    this.isOpen.update((open) => !open);

    if (this.isOpen() && this.messages().length === 0) {
      this.addWelcomeMessage();
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  async sendMessage(): Promise<void> {
    const message = this.inputMessage.trim();
    if (!message || this.isLoading()) return;

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

    // TODO: Integrar com API de IA
    // Por enquanto, resposta mockada
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: this.getMockResponse(message),
        timestamp: new Date(),
      };

      this.messages.update((msgs) => [...msgs, assistantMessage]);
      this.shouldScroll = true;
      this.isLoading.set(false);
    }, 1000);
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
        'Olá! Sou o assistente do StockHub. Posso ajudar você com informações sobre seu estoque, movimentações e relatórios. Como posso ajudar?',
      timestamp: new Date(),
    };

    this.messages.set([welcomeMessage]);
  }

  private getMockResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('estoque') || lowerMessage.includes('produto')) {
      return 'Para verificar informações de estoque, você pode acessar a página de Produtos ou o Dashboard. Posso te ajudar com algo mais específico?';
    }

    if (lowerMessage.includes('movimentação') || lowerMessage.includes('entrada') || lowerMessage.includes('saída')) {
      return 'As movimentações de estoque podem ser visualizadas na página de Movimentações. Lá você pode ver entradas, saídas e ajustes realizados.';
    }

    if (lowerMessage.includes('relatório')) {
      return 'Os relatórios estão disponíveis na aba Relatórios. Em breve teremos análises inteligentes com IA para te ajudar a entender melhor seus dados!';
    }

    return 'Entendi sua pergunta. Em breve terei integração completa com IA para te dar respostas mais precisas sobre seu estoque. Por enquanto, posso te direcionar para as páginas corretas do sistema.';
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
