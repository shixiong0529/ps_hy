import { useEffect, useRef, useState } from 'react'
import { TopMenu } from './components/TopMenu'
import { Toolbar } from './components/Toolbar'
import { EditorCanvas } from './components/EditorCanvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { LayersPanel } from './components/LayersPanel'
import { StatusBar } from './components/StatusBar'
import { ExportDialog } from './components/ExportDialog'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Toasts } from './components/Toasts'
import { useShortcuts } from './hooks/useShortcuts'

const MIN_PANEL = 220
const MIN_LAYERS = 140
const MAX_PANEL = 520

export default function App() {
  useShortcuts()

  const [panelW, setPanelW] = useState(288)
  const [layersH, setLayersH] = useState(300)
  const rightRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ type: 'panel' | 'layers'; start: number; from: number } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.type === 'panel') {
        const w = rightRef.current ? rightRef.current.getBoundingClientRect().right - e.clientX : d.from
        setPanelW(Math.max(MIN_PANEL, Math.min(MAX_PANEL, w)))
      } else {
        const h = window.innerHeight - e.clientY
        setLayersH(Math.max(MIN_LAYERS, Math.min(window.innerHeight - 220, h)))
      }
    }
    const onUp = () => {
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  const startDrag = (type: 'panel' | 'layers') => (e: React.MouseEvent) => {
    dragRef.current = { type, start: type === 'panel' ? e.clientX : e.clientY, from: type === 'panel' ? panelW : layersH }
    document.body.style.cursor = type === 'panel' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ps-bg">
      <TopMenu />

      <div className="flex min-h-0 flex-1">
        <Toolbar />

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorCanvas />
          <StatusBar />
        </div>

        <div
          onMouseDown={startDrag('panel')}
          className="w-[5px] shrink-0 cursor-col-resize bg-ps-border transition-colors hover:bg-ps-accent"
        />
        <div ref={rightRef} className="flex shrink-0 flex-col" style={{ width: panelW }}>
          <div className="min-h-0 flex-1">
            <PropertiesPanel />
          </div>
          <div
            onMouseDown={startDrag('layers')}
            className="h-[5px] shrink-0 cursor-row-resize bg-ps-border transition-colors hover:bg-ps-accent"
          />
          <div className="shrink-0 border-t border-ps-border" style={{ height: layersH }}>
            <LayersPanel />
          </div>
        </div>
      </div>

      <ExportDialog />
      <ShortcutsDialog />
      <Toasts />
    </div>
  )
}
