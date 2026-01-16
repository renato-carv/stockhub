import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './shared/components/chatbot/chatbot';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('stockHub');
}
