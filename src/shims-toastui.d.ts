// Toast UI's package.json `exports` has no `types` condition, so vue-tsc can't
// resolve its shipped declarations under bundler module resolution. Declare the
// minimal surface we actually use.
declare module '@toast-ui/editor' {
    interface EditorOptions {
        el: HTMLElement
        initialValue?: string
        initialEditType?: 'markdown' | 'wysiwyg'
        previewStyle?: 'tab' | 'vertical'
        height?: string
        usageStatistics?: boolean
        events?: Record<string, (...args: unknown[]) => void>
    }
    export default class Editor {
        constructor(options: EditorOptions)
        getMarkdown(): string
        destroy(): void
    }
}
