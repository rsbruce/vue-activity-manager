import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Render user-supplied markdown to HTML safe for v-html.
 *
 * marked does NOT sanitize its output, and description/notes fields flow through
 * the sync engine — so their content can arrive from another device or a
 * compromised server. Every markdown → HTML → v-html path must go through here
 * so DOMPurify strips scripts and event-handler attributes first.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return ''
  return DOMPurify.sanitize(marked(md) as string)
}
