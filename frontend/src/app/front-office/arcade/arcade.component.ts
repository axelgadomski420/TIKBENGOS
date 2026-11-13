import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-arcade',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#050507] text-white p-6 pb-32">
      <div class="max-w-md mx-auto">
        <h1 class="text-4xl font-serif text-[#C9A27C] mb-2">PURRE Arcade</h1>
        <p class="text-white/60 mb-8">Graj, zdobywaj XP i PURRE Coins. Bez hazardu — tylko zabawa.</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#2BE39B]/50 transition cursor-pointer">
            <div class="text-3xl mb-2">🔢</div>
            <h3 class="font-bold">PURRE 2048</h3>
            <p class="text-sm text-white/50">Klasyczna gra liczbowa</p>
          </div>
          <div class="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#8B5CF6]/50 transition cursor-pointer">
            <div class="text-3xl mb-2">🧠</div>
            <h3 class="font-bold">PURRE Memory</h3>
            <p class="text-sm text-white/50">Znajdź pary ras</p>
          </div>
          <div class="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#2BE39B]/50 transition cursor-pointer">
            <div class="text-3xl mb-2">❓</div>
            <h3 class="font-bold">PURRE Quiz</h3>
            <p class="text-sm text-white/50">Test wiedzy o rasach</p>
          </div>
          <div class="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-[#8B5CF6]/50 transition cursor-pointer">
            <div class="text-3xl mb-2">⬡</div>
            <h3 class="font-bold">PURRE Hex</h3>
            <p class="text-sm text-white/50">Strategia heksagonalna</p>
          </div>
        </div>
        <div class="mt-8 text-center text-sm text-white/40">
          Codzienne wyzwania i rankingi wkrótce. Nagrody tylko w PURRE Coins.
        </div>
      </div>
    </div>
  `
})
export class ArcadeComponent {}
