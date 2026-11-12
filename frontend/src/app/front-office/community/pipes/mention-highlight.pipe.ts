import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'mentionHighlight'
})
export class MentionHighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    const raw = value || '';
    const escaped = this.escapeHtml(raw);
    const highlighted = escaped
      .replace(/(^|[^A-Za-z0-9_])(@[A-Za-z0-9._-]{2,50})/g, '$1<span class="community-mention-highlight">$2</span>')
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
