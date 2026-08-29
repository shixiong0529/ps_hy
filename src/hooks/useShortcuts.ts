import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import type { ToolId } from '@/types'

const TOOL_KEYS: Record<string, ToolId> = {
  v: 'select',
  h: 'hand',
  c: 'crop',
  b: 'brush',
  e: 'eraser',
  t: 'text',
  r: 'rect',
  o: 'ellipse',
  l: 'line',
  y: 'triangle',
}

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.isContentEditable
}

function isEditingText() {
  const engine = useEditorStore.getState().engine
  const obj = engine?.canvas.getActiveObject() as { isEditing?: boolean } | undefined
  return !!obj?.isEditing
}

export function useShortcuts() {
  useEffect(() => {
    const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

    const onKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState()
      const engine = store.engine

      // 关闭浮层
      if (e.key === 'Escape') {
        if (store.openMenu) {
          useEditorStore.setState({ openMenu: null })
          return
        }
        if (store.exportOpen) return store.setExportOpen(false)
        if (store.shortcutsOpen) return store.setShortcutsOpen(false)
        if (store.tool === 'crop') return engine?.setTool('select')
        return engine?.deselect()
      }

      if (store.exportOpen || store.shortcutsOpen) return

      // 输入控件和 Fabric IText 正在编辑时，保留浏览器原生的复制、全选、
      // 撤销等行为，避免被画布级快捷键抢占。
      if (isTypingTarget(e.target) || isEditingText()) return

      if (mod(e)) {
        const k = e.key.toLowerCase()
        if (k === 'z') {
          e.preventDefault()
          if (e.shiftKey) engine?.redo()
          else engine?.undo()
          return
        }
        if (k === 'y') {
          e.preventDefault()
          engine?.redo()
          return
        }
        if (k === 's') {
          e.preventDefault()
          store.setExportOpen(true)
          return
        }
        if (k === 'o') {
          e.preventDefault()
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/jpeg,image/png,image/webp'
          input.onchange = () => {
            const f = input.files?.[0]
            if (f) void engine?.addImageFromFile(f)
          }
          input.click()
          return
        }
        if (k === 'a') {
          e.preventDefault()
          engine?.selectAll()
          return
        }
        if (k === 'd') {
          e.preventDefault()
          engine?.deselect()
          return
        }
        if (k === 'j') {
          e.preventDefault()
          engine?.duplicateActive()
          return
        }
        if (k === '0') {
          e.preventDefault()
          engine?.fitToScreen()
          return
        }
        if (k === '=' || k === '+') {
          e.preventDefault()
          engine?.zoomBy(1.2)
          return
        }
        if (k === '-') {
          e.preventDefault()
          engine?.zoomBy(1 / 1.2)
          return
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        engine?.deleteActive()
        return
      }

      if (e.key === 'Enter' && store.tool === 'crop') {
        e.preventDefault()
        engine?.applyCrop()
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        engine?.setSpaceDown(true)
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        store.setShortcutsOpen(true)
        return
      }

      if (e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 10 : 1
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        }
        const [dx, dy] = delta[e.key]
        if (!engine?.canvas.getActiveObjects().length) return
        e.preventDefault()
        engine.nudgeActive(dx, dy)
        return
      }

      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool) {
        e.preventDefault()
        engine?.setTool(tool)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') useEditorStore.getState().engine?.setSpaceDown(false)
    }

    const onBlur = () => useEditorStore.getState().engine?.setSpaceDown(false)

    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target) || isEditingText()) return
      const engine = useEditorStore.getState().engine
      const items = Array.from(e.clipboardData?.items ?? [])
      const img = items.find((i) => i.type.startsWith('image/'))
      if (!img) return
      const file = img.getAsFile()
      if (file) {
        e.preventDefault()
        void engine?.addImageFromFile(file)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('paste', onPaste)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
