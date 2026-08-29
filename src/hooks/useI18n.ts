import { useCallback } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { translate } from '@/lib/i18n'

export function useI18n() {
  const language = useEditorStore((s) => s.language)
  const t = useCallback(
    (source: string, vars?: Record<string, string | number>) => translate(language, source, vars),
    [language],
  )
  return { language, t }
}
