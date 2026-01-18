import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIStreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly apiUrl = environment.apiUrl;

  chat(teamId: string, message: string): Observable<AIStreamChunk> {
    return new Observable((subscriber) => {
      const controller = new AbortController();

      fetch(`${this.apiUrl}/teams/${teamId}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message }),
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

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  subscriber.next(data);
                } catch {
                  subscriber.error('Invalid JSON');
                  break;
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
}
