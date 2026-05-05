/**
 * Inline SVG markup for the lucide icons used in the Overview Mermaid diagram.
 *
 * Why not the lucide-static icon font? Loading the font ships every glyph
 * (~22MB of font files + a 1972-line CSS) for the ~10 icons we actually use.
 * Importing the individual SVG files via Vite's `?raw` query brings in only
 * the ones referenced here (≈5KB total).
 *
 * Each SVG already uses `stroke="currentColor"`, so the icon colour follows
 * whatever the surrounding label text colour is (works for both light/dark
 * VSCode themes without extra rules).
 *
 * Keep the keys in sync with `NODE_INLINE_ICON` in
 * `src/shared/services/workflow-prompt-generator.ts`.
 */

import bot from 'lucide-static/icons/bot.svg?raw';
import gitBranch from 'lucide-static/icons/git-branch.svg?raw';
import gitFork from 'lucide-static/icons/git-fork.svg?raw';
import messageSquare from 'lucide-static/icons/message-square.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';
import plug from 'lucide-static/icons/plug.svg?raw';
import shieldQuestion from 'lucide-static/icons/shield-question.svg?raw';
import square from 'lucide-static/icons/square.svg?raw';
import terminal from 'lucide-static/icons/terminal.svg?raw';
import zap from 'lucide-static/icons/zap.svg?raw';

/**
 * Strip the leading license comment, then rewrite the *root* `<svg>` opening
 * tag: drop its `width`/`height`/`class`/`style`/`xmlns` (we'll add our own)
 * while preserving all other attributes (`viewBox`, `fill`, `stroke`, etc.)
 * and — critically — leaving every descendant element untouched. An earlier
 * iteration scrubbed those attribute names everywhere, which silently broke
 * icons whose `<rect>` children rely on `width`/`height` to define the
 * rectangle (e.g. `bot`, where the body became invisible).
 *
 * Width/height are pinned via *inline style* (in addition to the attributes)
 * so any nested CSS that targets `svg` cannot stretch the icon — Mermaid's
 * foreignObject context is busy and an inherited `width: 100%` rule would
 * otherwise blow the icon up.
 *
 * Done once at module load so the lookup map holds ready-to-inject markup.
 */
function prep(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
      const cleaned = attrs.replace(/\s+(?:width|height|class|style|xmlns)="[^"]*"/g, '');
      // 1.1em width/height keeps the icon proportional to surrounding label
      // text (matches the prior lucide-static font sizing); vertical-align
      // shifts the icon down so its visual centre meets the text baseline.
      // Inline style overrides any inherited `svg { width: 100% }` rules
      // that would otherwise stretch the icon to fill the foreignObject.
      return `<svg xmlns="http://www.w3.org/2000/svg" class="overview-mermaid-icon" aria-hidden="true" style="width:1.1em;height:1.1em;flex:none;display:inline-block;vertical-align:-0.2em"${cleaned}>`;
    })
    .trim();
}

export const LUCIDE_SVG: Record<string, string> = {
  bot: prep(bot),
  'git-branch': prep(gitBranch),
  'git-fork': prep(gitFork),
  'message-square': prep(messageSquare),
  play: prep(play),
  plug: prep(plug),
  'shield-question': prep(shieldQuestion),
  square: prep(square),
  terminal: prep(terminal),
  zap: prep(zap),
};
