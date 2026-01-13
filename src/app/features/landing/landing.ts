import { Component } from '@angular/core';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { Button } from '../../shared/components/button/button';
import {
  LucideAngularModule,
  Package,
  BarChart3,
  ArrowRightLeft,
  Users,
  Bell,
  Shield,
  Play,
  Sparkles,
  Brain,
  TrendingUp,
  Zap,
  Check,
  ChevronDown,
  Star,
  Upload,
  Settings,
  Rocket,
} from 'lucide-angular';

@Component({
  selector: 'app-landing',
  imports: [LucideAngularModule, ThemeToggle, Button],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  readonly Package = Package;
  readonly BarChart3 = BarChart3;
  readonly ArrowRightLeft = ArrowRightLeft;
  readonly Users = Users;
  readonly Bell = Bell;
  readonly Shield = Shield;
  readonly Play = Play;
  readonly Sparkles = Sparkles;
  readonly Brain = Brain;
  readonly TrendingUp = TrendingUp;
  readonly Zap = Zap;
  readonly Check = Check;
  readonly ChevronDown = ChevronDown;
  readonly Star = Star;
  readonly Upload = Upload;
  readonly Settings = Settings;
  readonly Rocket = Rocket;

  openFaqs = new Set<number>();

  onDemo() {
    alert('Demonstração em breve!');
  }

  toggleFaq(index: number) {
    if (this.openFaqs.has(index)) {
      this.openFaqs.delete(index);
    } else {
      this.openFaqs.add(index);
    }
  }

  isFaqOpen(index: number): boolean {
    return this.openFaqs.has(index);
  }
}
