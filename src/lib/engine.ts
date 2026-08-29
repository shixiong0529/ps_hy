import * as fabric from 'fabric'
import { useEditorStore } from '@/store/editorStore'
import { applyAdjustments } from './adjustments'
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_DOC,
  MAX_IMAGE_EDGE,
  SHAPE_TOOLS,
  clamp,
  fileToDataUrl,
  isAcceptedImageFile,
  uid,
} from './defaults'
import { BUILTIN_PRESETS, registerFilterPreset } from './registry'
import type {
  Adjustments,
  AnyObject,
  ExportOptions,
  LayerMeta,
  LayerType,
  SelectionSnapshot,
  Snapshot,
  ToolId,
} from '@/types'

/* 注册内置滤镜预设（后续接入 AI 滤镜 / 抠图，同样调用 registerFilterPreset 即可） */
BUILTIN_PRESETS.forEach(registerFilterPreset)

const EXTRA_PROPS = [
  'layerId',
  'layerName',
  'layerType',
  'locked',
  'isMask',
  'isEraserPath',
  'globalCompositeOperation',
]
const HISTORY_LIMIT = 60
const MIN_ZOOM = 0.02
const MAX_ZOOM = 32

const getStore = () => useEditorStore.getState()
const isLayerObject = (obj: AnyObject) => !obj.isMask && !obj.isEraserPath

export class EditorEngine {
  canvas: fabric.Canvas
  docSize = { width: DEFAULT_DOC.width, height: DEFAULT_DOC.height }

  private history: Snapshot[] = []
  private future: Snapshot[] = []
  private currentSnapshot: Snapshot

  private suspending = false
  private disposing = false
  private restoring = false

  private spaceDown = false
  private panning = false
  private panStart = { x: 0, y: 0 }

  private drawingShape: fabric.FabricObject | null = null
  private shapeOrigin: fabric.Point | null = null

  cropRect: fabric.Rect | null = null
  private cropMasks: fabric.Rect[] = []

  private pushTimer: number | null = null
  private nameCounters: Record<string, number> = {}
  private tool: ToolId = 'select'
  private readonly refreshCanvasOffset = () => {
    if (!this.disposing) this.canvas.calcOffset()
  }

  constructor(el: HTMLCanvasElement) {
    this.canvas = new fabric.Canvas(el, {
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: '',
      fireRightClick: true,
      stopContextMenu: true,
      uniformScaling: true,
      selectionColor: 'rgba(61,126,255,0.14)',
      selectionBorderColor: '#3d7eff',
      selectionLineWidth: 1,
    })

    this.applyControlStyle()
    this.bindEvents()
    window.addEventListener('resize', this.refreshCanvasOffset, { passive: true })
    window.addEventListener('scroll', this.refreshCanvasOffset, true)
    this.currentSnapshot = this.serialize()
    getStore().setHistory(false, false)
  }

  /* ------------------------------------------------------------------ */
  /* 初始化                                                              */
  /* ------------------------------------------------------------------ */

  private applyControlStyle() {
    const proto = fabric.FabricObject.prototype as unknown as Record<string, unknown>
    Object.assign(proto, {
      borderColor: '#3d7eff',
      cornerColor: '#0b0d11',
      cornerStrokeColor: '#3d7eff',
      cornerSize: 10,
      cornerStyle: 'circle',
      transparentCorners: false,
      borderScaleFactor: 1.4,
      padding: 0,
    })
  }

  /* ------------------------------------------------------------------ */
  /* 事件                                                                */
  /* ------------------------------------------------------------------ */

  private bindEvents() {
    const c = this.canvas

    c.on('object:added', (opt) => {
      const target = opt.target as AnyObject | undefined
      if (target?.isMask) return
      if (target?.isEraserPath) {
        if (!this.suspending) this.schedulePush()
        return
      }
      this.syncLayers()
      if (!this.suspending) this.schedulePush()
    })
    c.on('object:removed', (opt) => {
      const target = opt.target as AnyObject | undefined
      if (target?.isMask || target?.isEraserPath) return
      this.syncLayers()
      if (!this.suspending) this.schedulePush()
    })
    c.on('object:modified', (opt) => {
      if ((opt.target as AnyObject | undefined)?.isMask) {
        this.constrainCrop()
        this.updateCropMask()
        return
      }
      this.syncLayers()
      this.syncSelection()
      if (!this.suspending) this.pushHistoryState()
    })
    c.on('object:moving', (opt) => {
      if ((opt.target as AnyObject | undefined)?.isMask) this.constrainCrop()
      if (this.cropRect) this.updateCropMask()
    })
    c.on('object:scaling', (opt) => {
      if ((opt.target as AnyObject | undefined)?.isMask) this.constrainCrop()
      if (this.cropRect) this.updateCropMask()
    })

    c.on('selection:created', () => this.syncSelection())
    c.on('selection:updated', () => this.syncSelection())
    c.on('selection:cleared', () => this.syncSelection())

    c.on('text:changed', () => {
      this.syncLayers()
      this.syncSelection()
      if (!this.suspending) this.schedulePush()
    })

    // PencilBrush 会先触发 before:path:created，再把 Path 加到画布。
    // 必须在 object:added 之前标记内部橡皮擦轨迹，避免图层面板短暂增加一层。
    c.on('before:path:created', (opt) => {
      const path = (opt.path ?? null) as AnyObject | null
      if (!path) return
      const erasing = this.tool === 'eraser'
      if (erasing) {
        path.isEraserPath = true
        path.set({
          stroke: '#000000',
          fill: '',
          globalCompositeOperation: 'destination-out',
          selectable: false,
          evented: false,
        } as never)
        path.dirty = true
        return
      }
      path.layerId = path.layerId ?? uid('ly')
      path.layerType = 'path'
      path.layerName = '画笔'
    })

    c.on('path:created', (opt) => {
      const path = (opt.path ?? null) as AnyObject | null
      if (!path) return
      if (path.isEraserPath) {
        this.canvas.requestRenderAll()
        return
      }
      path.layerId = path.layerId ?? uid('ly')
      path.layerType = 'path'
      path.layerName = path.layerName ?? '画笔'
      this.syncLayers()
    })

    c.on('mouse:down', (opt) => this.onMouseDown(opt))
    c.on('mouse:move', (opt) => this.onMouseMove(opt))
    c.on('mouse:up', () => this.onMouseUp())
    c.on('mouse:wheel', (opt) => this.onWheel(opt))
    c.on('mouse:dblclick', (opt) => this.onDblClick(opt))
  }

  private getScenePoint(e: fabric.TPointerEventInfo['e']) {
    return this.canvas.getScenePoint(e)
  }

  private onMouseDown(opt: fabric.TPointerEventInfo) {
    const e = opt.e as MouseEvent
    const tool = getStore().tool

    if (e.button === 1 || this.spaceDown || tool === 'hand') {
      this.panning = true
      this.panStart = { x: e.clientX, y: e.clientY }
      this.canvas.setCursor('grabbing')
      return
    }

    if (tool === 'text') {
      const target = opt.target as AnyObject | undefined
      if (target?.isType?.('i-text', 'text', 'textbox')) {
        this.enterTextEditing(target)
        return
      }
      const p = this.getScenePoint(e)
      this.addText(p.x, p.y)
      return
    }

    if (SHAPE_TOOLS.includes(tool) && !this.cropRect) {
      const p = this.getScenePoint(e)
      this.shapeOrigin = p
      this.drawingShape = this.createShape(tool, p)
      this.tagObject(this.drawingShape as AnyObject, tool as LayerType)
      this.canvas.add(this.drawingShape)
      this.canvas.requestRenderAll()
    }
  }

  private onMouseMove(opt: fabric.TPointerEventInfo) {
    const e = opt.e as MouseEvent

    if (this.panning) {
      const dx = e.clientX - this.panStart.x
      const dy = e.clientY - this.panStart.y
      this.panStart = { x: e.clientX, y: e.clientY }
      this.canvas.relativePan(new fabric.Point(dx, dy))
      this.syncView()
      return
    }

    if (this.drawingShape && this.shapeOrigin) {
      const p = this.getScenePoint(e)
      const o = this.shapeOrigin
      let w = p.x - o.x
      let h = p.y - o.y
      if (e.shiftKey) {
        const m = Math.max(Math.abs(w), Math.abs(h))
        w = Math.sign(w || 1) * m
        h = Math.sign(h || 1) * m
      }
      this.applyShapeGeometry(this.drawingShape, o, w, h)
      this.canvas.requestRenderAll()
    }
  }

  private onMouseUp() {
    if (this.panning) {
      this.panning = false
      this.canvas.setCursor(getStore().tool === 'hand' ? 'grab' : 'default')
      return
    }

    const shape = this.drawingShape
    this.drawingShape = null
    this.shapeOrigin = null
    if (!shape) return

    if (shape.getScaledWidth() < 4 && shape.getScaledHeight() < 4) {
      this.applyShapeGeometry(
        shape,
        new fabric.Point(shape.left, shape.top),
        Math.min(260, this.docSize.width * 0.3),
        Math.min(180, this.docSize.height * 0.3),
      )
    }
    shape.setCoords()
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.setTool('select')
    this.selectObject(shape)
  }

  private onWheel(opt: fabric.TPointerEventInfo<WheelEvent>) {
    const e = opt.e
    e.preventDefault()
    e.stopPropagation()

    if (e.shiftKey) {
      this.canvas.relativePan(new fabric.Point(-e.deltaY, 0))
      this.syncView()
      return
    }
    const next = clamp(this.canvas.getZoom() * Math.pow(0.999, e.deltaY), MIN_ZOOM, MAX_ZOOM)
    this.canvas.zoomToPoint(this.canvas.getViewportPoint(e), next)
    this.syncView()
  }

  private onDblClick(opt: fabric.TPointerEventInfo) {
    const target = opt.target as AnyObject | undefined
    if (target && target.isType && target.isType('i-text', 'text', 'textbox')) {
      this.enterTextEditing(target)
    }
  }

  /* ------------------------------------------------------------------ */
  /* 视图                                                                */
  /* ------------------------------------------------------------------ */

  setViewportSize(width: number, height: number) {
    if (this.disposing) return
    this.canvas.setDimensions({ width: Math.max(1, width), height: Math.max(1, height) })
    this.canvas.calcOffset()
    this.canvas.requestRenderAll()
    this.syncView()
  }

  fitToScreen(margin = 0.92) {
    const w = this.canvas.getWidth() || 1
    const h = this.canvas.getHeight() || 1
    const zoom = clamp(
      Math.min(w / this.docSize.width, h / this.docSize.height) * margin,
      MIN_ZOOM,
      MAX_ZOOM,
    )
    this.canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0])
    this.canvas.relativePan(new fabric.Point((w - this.docSize.width * zoom) / 2, (h - this.docSize.height * zoom) / 2))
    this.syncView()
    this.canvas.requestRenderAll()
  }

  setZoom(zoom: number) {
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
    const w = this.canvas.getWidth() || 1
    const h = this.canvas.getHeight() || 1
    this.canvas.zoomToPoint(new fabric.Point(w / 2, h / 2), z)
    this.canvas.requestRenderAll()
    this.syncView()
  }

  zoomBy(factor: number) {
    this.setZoom(this.canvas.getZoom() * factor)
  }

  syncView() {
    const vpt = this.canvas.viewportTransform
    getStore().setView({ zoom: vpt[0], panX: vpt[4], panY: vpt[5] })
  }

  /* ------------------------------------------------------------------ */
  /* 工具                                                                */
  /* ------------------------------------------------------------------ */

  setTool(tool: ToolId) {
    if (this.drawingShape) {
      this.canvas.remove(this.drawingShape)
      this.drawingShape = null
      this.shapeOrigin = null
    }
    this.panning = false
    this.tool = tool
    const store = getStore()
    const c = this.canvas
    const brush = store.brush

    c.isDrawingMode = tool === 'brush' || tool === 'eraser'
    c.selection = tool === 'select'
    c.skipTargetFind = tool === 'hand' || SHAPE_TOOLS.includes(tool)
    c.defaultCursor =
      tool === 'hand' ? 'grab' : tool === 'text' ? 'text' : SHAPE_TOOLS.includes(tool) ? 'crosshair' : 'default'
    c.hoverCursor = tool === 'select' ? 'move' : c.defaultCursor

    if (c.isDrawingMode) {
      c.calcOffset()
      const pencil = new fabric.PencilBrush(c)
      pencil.color = this.brushColor(tool, brush.color, brush.opacity)
      pencil.width = brush.width
      pencil.strokeLineCap = 'round'
      pencil.strokeLineJoin = 'round'
      c.freeDrawingBrush = pencil
    }

    if (tool !== 'crop') this.cancelCrop(false)

    const inCrop = tool === 'crop'
    c.forEachObject((o) => {
      const obj = o as AnyObject
      if (obj.isMask) return
      if (obj.isEraserPath) {
        obj.evented = false
        obj.selectable = false
        return
      }
      obj.evented = !inCrop && !obj.locked
      obj.selectable = !inCrop && !obj.locked
    })

    if (tool !== 'select') c.discardActiveObject()
    c.requestRenderAll()

    store.setTool(tool)
    this.syncSelection()
    if (inCrop) this.startCrop()
  }

  refreshBrush() {
    const b = getStore().brush
    const brush = this.canvas.freeDrawingBrush as unknown as fabric.PencilBrush | undefined
    if (brush && this.canvas.isDrawingMode) {
      brush.color = this.brushColor(this.tool, b.color, b.opacity)
      brush.width = b.width
    }
  }

  private brushColor(tool: ToolId, color: string, opacity: number) {
    if (tool === 'eraser') return 'rgba(0,0,0,1)'
    const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1]
    if (!hex || opacity >= 100) return color
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${clamp(opacity, 0, 100) / 100})`
  }

  setSpaceDown(v: boolean) {
    this.spaceDown = v
    this.canvas.setCursor(v ? 'grab' : getStore().tool === 'hand' ? 'grab' : 'default')
  }

  /* ------------------------------------------------------------------ */
  /* 创建对象                                                            */
  /* ------------------------------------------------------------------ */

  private nextName(type: LayerType) {
    const base: Record<LayerType, string> = {
      image: '图片',
      text: '文字',
      rect: '矩形',
      ellipse: '椭圆',
      line: '直线',
      triangle: '三角形',
      path: '路径',
      group: '组',
      unknown: '对象',
    }
    const key = base[type] ?? '对象'
    this.nameCounters[key] = (this.nameCounters[key] ?? 0) + 1
    return `${key} ${this.nameCounters[key]}`
  }

  private tagObject(obj: AnyObject, type: LayerType, name?: string) {
    obj.layerId = obj.layerId ?? uid('ly')
    obj.layerType = type
    obj.layerName = name ?? this.nextName(type)
    obj.locked = obj.locked ?? false
    return obj
  }

  async addImageFromFile(file: File) {
    if (!isAcceptedImageFile(file)) {
      getStore().toast('仅支持 JPG / PNG / WebP 格式', 'error')
      return null
    }
    try {
      const raw = await fileToDataUrl(file)
      const url = await this.maybeDownscale(raw)
      return await this.addImageFromDataUrl(url, file.name.replace(/\.[^.]+$/, ''))
    } catch {
      getStore().toast('图片读取失败', 'error')
      return null
    }
  }

  /** 超大图降采样，保证滤镜与撤销的流畅度 */
  private maybeDownscale(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const max = Math.max(img.width, img.height)
        if (max <= MAX_IMAGE_EDGE) return resolve(dataUrl)
        const scale = MAX_IMAGE_EDGE / max
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * scale)
        cv.height = Math.round(img.height * scale)
        const ctx = cv.getContext('2d')
        if (!ctx) return resolve(dataUrl)
        ctx.drawImage(img, 0, 0, cv.width, cv.height)
        resolve(cv.toDataURL('image/png'))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  async addImageFromDataUrl(dataUrl: string, name?: string) {
    try {
      const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
      const isFirst = !this.canvas.getObjects().some((o) => isLayerObject(o as AnyObject))

      if (isFirst) {
        this.docSize = {
          width: Math.round(img.width || DEFAULT_DOC.width),
          height: Math.round(img.height || DEFAULT_DOC.height),
        }
        getStore().setDoc({ ...this.docSize })
      } else {
        const maxEdge = Math.min(this.docSize.width, this.docSize.height) * 0.6
        img.scale(Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1)))
      }

      const obj = img as unknown as AnyObject
      this.tagObject(obj, 'image', name || undefined)
      img.set({
        left: (this.docSize.width - img.getScaledWidth()) / 2,
        top: (this.docSize.height - img.getScaledHeight()) / 2,
        originX: 'left',
        originY: 'top',
        // 大图使用对象缓存时，浏览器可能在显存回收后留下空缓存。
        // 图片直接从源元素绘制更稳定，滤镜仍由 Fabric 的 filteredEl 负责。
        objectCaching: false,
      })
      this.canvas.add(img)
      this.canvas.setActiveObject(img)
      this.canvas.requestRenderAll()
      this.pushHistoryState()
      this.syncLayers()
      this.syncSelection()
      if (isFirst) this.fitToScreen()
      return obj
    } catch {
      getStore().toast('图片加载失败', 'error')
      return null
    }
  }

  addText(x?: number, y?: number) {
    const s = getStore().text
    const text = new fabric.IText('双击编辑文字', {
      left: x ?? this.docSize.width / 2,
      top: y ?? this.docSize.height / 2,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fill: s.fill,
      fontWeight: s.fontWeight as never,
      textAlign: s.textAlign as never,
      originX: 'left',
      originY: 'top',
      editingBorderColor: '#3d7eff',
    })
    this.tagObject(text as unknown as AnyObject, 'text')
    this.canvas.add(text)
    this.enterTextEditing(text as unknown as AnyObject)
    this.pushHistoryState()
    return text as unknown as AnyObject
  }

  /** 所有入口都通过这里进入 IText 编辑态，避免只选中却无法输入。 */
  private enterTextEditing(obj: AnyObject) {
    if (!obj.isType?.('i-text', 'text', 'textbox') || obj.visible === false || obj.locked) return false
    const text = obj as unknown as fabric.IText
    this.setTool('select')
    this.selectObject(text)
    text.enterEditing()
    text.selectAll()
    text.hiddenTextarea?.focus()
    this.canvas.requestRenderAll()
    this.syncSelection()
    return true
  }

  editText(id: string) {
    const obj = this.findById(id)
    return obj ? this.enterTextEditing(obj) : false
  }

  private createShape(tool: ToolId, p: fabric.Point): fabric.FabricObject {
    const st = getStore().shape
    const common = {
      left: p.x,
      top: p.y,
      fill: st.fill,
      stroke: st.strokeWidth > 0 ? st.stroke : null,
      strokeWidth: st.strokeWidth,
      strokeUniform: true,
      objectCaching: false,
    }

    if (tool === 'ellipse') return new fabric.Ellipse({ ...common, rx: 0, ry: 0 } as never)
    if (tool === 'line') {
      return new fabric.Line([p.x, p.y, p.x, p.y], {
        stroke: st.fill === 'transparent' ? st.stroke || '#ffffff' : st.fill,
        strokeWidth: Math.max(2, st.strokeWidth || 4),
        strokeLineCap: 'round',
        objectCaching: false,
      })
    }
    if (tool === 'triangle') return new fabric.Triangle({ ...common, width: 0, height: 0 } as never)
    return new fabric.Rect({ ...common, width: 0, height: 0, rx: st.rx, ry: st.rx } as never)
  }

  private applyShapeGeometry(shape: fabric.FabricObject, origin: fabric.Point, w: number, h: number) {
    if (shape.isType('line')) {
      ;(shape as fabric.Line).set({ x1: origin.x, y1: origin.y, x2: origin.x + w, y2: origin.y + h })
      return
    }
    if (shape.isType('ellipse')) {
      ;(shape as fabric.Ellipse).set({
        left: w < 0 ? origin.x + w : origin.x,
        top: h < 0 ? origin.y + h : origin.y,
        rx: Math.abs(w) / 2,
        ry: Math.abs(h) / 2,
      })
      return
    }
    shape.set({
      left: w < 0 ? origin.x + w : origin.x,
      top: h < 0 ? origin.y + h : origin.y,
      width: Math.abs(w),
      height: Math.abs(h),
      scaleX: 1,
      scaleY: 1,
    })
  }

  /* ------------------------------------------------------------------ */
  /* 选区与变换                                                          */
  /* ------------------------------------------------------------------ */

  selectObject(obj: fabric.FabricObject) {
    this.canvas.setActiveObject(obj)
    this.canvas.requestRenderAll()
    this.syncSelection()
  }

  deleteActive() {
    const objs = this.canvas.getActiveObjects()
    if (!objs.length) return
    this.canvas.discardActiveObject()
    objs.forEach((o) => this.canvas.remove(o))
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncLayers()
    this.syncSelection()
  }

  duplicateActive() {
    const objs = this.canvas.getActiveObjects()
    if (!objs.length) return
    Promise.all(
      objs.map(async (o) => {
        const clone = (await o.clone()) as AnyObject
        const source = o as AnyObject
        clone.layerId = uid('ly')
        clone.layerType = source.layerType
        clone.layerName = `${source.layerName ?? '图层'} 副本`
        clone.locked = false
        clone.set({ left: (clone.left ?? 0) + 24, top: (clone.top ?? 0) + 24 })
        clone.setCoords()
        this.canvas.add(clone as fabric.FabricObject)
        const sourceAdjustment = source.layerId ? getStore().adjustments[source.layerId] : undefined
        if (sourceAdjustment && clone.layerId) {
          getStore().setAdjustment(clone.layerId, { ...sourceAdjustment })
          applyAdjustments(clone, sourceAdjustment)
        }
        return clone
      }),
    ).then((clones) => {
      this.canvas.discardActiveObject()
      if (clones.length === 1) {
        this.canvas.setActiveObject(clones[0] as fabric.FabricObject)
      } else if (clones.length > 1) {
        this.canvas.setActiveObject(
          new fabric.ActiveSelection(clones as fabric.FabricObject[], { canvas: this.canvas }),
        )
      }
      this.canvas.requestRenderAll()
      this.pushHistoryState()
      this.syncLayers()
      this.syncSelection()
    })
  }

  selectAll() {
    const objs = this.canvas
      .getObjects()
      .filter((o) => isLayerObject(o as AnyObject) && o.visible && o.selectable)
    if (!objs.length) return
    this.canvas.discardActiveObject()
    this.canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas: this.canvas }))
    this.canvas.requestRenderAll()
    this.syncSelection()
  }

  deselect() {
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
    this.syncSelection()
  }

  rotateActive(deg: number) {
    const objs = this.canvas.getActiveObjects()
    if (!objs.length) return
    objs.forEach((o) => {
      o.rotate((o.angle ?? 0) + deg)
      o.setCoords()
    })
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncSelection()
  }

  flipActive(axis: 'x' | 'y') {
    const objs = this.canvas.getActiveObjects()
    if (!objs.length) return
    objs.forEach((o) => {
      o.set(axis === 'x' ? 'flipX' : 'flipY', !o[axis === 'x' ? 'flipX' : 'flipY'])
      o.setCoords()
    })
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncSelection()
  }

  rotateDocument(deg: number) {
    const c = this.canvas
    const { width: w, height: h } = this.docSize
    const nextDoc = Math.abs(deg) % 180 === 90 ? { width: h, height: w } : { width: w, height: h }
    const oldCenter = new fabric.Point(w / 2, h / 2)
    const newCenter = new fabric.Point(nextDoc.width / 2, nextDoc.height / 2)
    c.discardActiveObject()
    const rad = (deg * Math.PI) / 180
    c.forEachObject((o) => {
      const obj = o as AnyObject
      if (obj.isMask) return
      const center = obj.getCenterPoint()
      const dx = center.x - oldCenter.x
      const dy = center.y - oldCenter.y
      const rotatedCenter = new fabric.Point(
        newCenter.x + dx * Math.cos(rad) - dy * Math.sin(rad),
        newCenter.y + dx * Math.sin(rad) + dy * Math.cos(rad),
      )
      obj.rotate((obj.angle ?? 0) + deg)
      obj.setPositionByOrigin(rotatedCenter, 'center', 'center')
      obj.setCoords()
    })
    this.docSize = nextDoc
    getStore().setDoc({ ...this.docSize })
    c.requestRenderAll()
    this.pushHistoryState()
    this.fitToScreen()
  }

  /** 立即写入属性；commit=false 时用于拖拽/滑块过程，结束后再 pushHistoryState */
  updateActive(props: Record<string, unknown>, commit = true) {
    const objs = this.canvas.getActiveObjects().filter((o) => !(o as AnyObject).locked)
    if (!objs.length) return
    objs.forEach((o) => {
      o.set(props as never)
      o.setCoords()
    })
    this.canvas.requestRenderAll()
    this.syncSelection()
    this.syncLayers()
    if (commit) this.pushHistoryState()
  }

  nudgeActive(dx: number, dy: number) {
    const objs = this.canvas.getActiveObjects().filter((o) => !(o as AnyObject).locked)
    if (!objs.length) return
    objs.forEach((o) => {
      o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy })
      o.setCoords()
    })
    this.canvas.requestRenderAll()
    this.syncSelection()
    this.schedulePush()
  }

  /* ------------------------------------------------------------------ */
  /* 图层                                                                */
  /* ------------------------------------------------------------------ */

  private syncLayers() {
    if (this.disposing) return
    const active = new Set(this.canvas.getActiveObjects().map((o) => (o as AnyObject).layerId))
    const layers: LayerMeta[] = this.canvas
      .getObjects()
      .filter((o) => isLayerObject(o as AnyObject))
      .map((o) => {
        const obj = o as AnyObject
        return {
          id: obj.layerId ?? '',
          name: obj.layerName ?? '图层',
          type: (obj.layerType ?? 'unknown') as LayerType,
          visible: obj.visible !== false,
          locked: !!obj.locked,
          opacity: obj.opacity ?? 1,
          active: active.has(obj.layerId),
        }
      })
      .reverse() // 顶层图层显示在列表顶部

    getStore().setLayers(layers)
  }

  private findById(id: string) {
    return this.canvas.getObjects().find((o) => (o as AnyObject).layerId === id) as AnyObject | undefined
  }

  selectLayer(id: string) {
    const obj = this.findById(id)
    if (!obj) return
    if (obj.visible === false || obj.locked) return
    this.setTool('select')
    if (this.canvas.getActiveObjects().length > 1) this.canvas.discardActiveObject()
    this.canvas.setActiveObject(obj as fabric.FabricObject)
    this.canvas.requestRenderAll()
    this.syncSelection()
  }

  setLayerVisible(id: string, visible: boolean) {
    const obj = this.findById(id)
    if (!obj) return
    obj.set({ visible })
    if (!visible && this.canvas.getActiveObjects().includes(obj as fabric.FabricObject)) {
      this.canvas.discardActiveObject()
    }
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncLayers()
    this.syncSelection()
  }

  setLayerLocked(id: string, locked: boolean) {
    const obj = this.findById(id)
    if (!obj) return
    obj.locked = locked
    obj.set({
      selectable: !locked && getStore().tool !== 'crop',
      evented: !locked && getStore().tool !== 'crop',
    })
    if (locked && this.canvas.getActiveObjects().includes(obj as fabric.FabricObject)) {
      this.canvas.discardActiveObject()
    }
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncLayers()
    this.syncSelection()
  }

  setLayerOpacity(id: string, opacity: number, commit = true) {
    const obj = this.findById(id)
    if (!obj) return
    obj.set({ opacity })
    this.canvas.requestRenderAll()
    this.syncSelection()
    if (commit) this.pushHistoryState()
  }

  renameLayer(id: string, name: string) {
    const obj = this.findById(id)
    if (!obj) return
    obj.layerName = name
    this.syncLayers()
    this.pushHistoryState()
  }

  reorderLayer(id: string, action: 'up' | 'down' | 'top' | 'bottom') {
    const obj = this.findById(id)
    if (!obj) return
    const order = this.canvas.getObjects().filter((o) => isLayerObject(o as AnyObject))
    const from = order.indexOf(obj as fabric.FabricObject)
    if (from < 0) return
    const to =
      action === 'up'
        ? Math.min(order.length - 1, from + 1)
        : action === 'down'
          ? Math.max(0, from - 1)
          : action === 'top'
            ? order.length - 1
            : 0
    if (from === to) return
    order.splice(from, 1)
    order.splice(to, 0, obj as fabric.FabricObject)
    this.applyLayerOrder(order)
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncLayers()
  }

  /** 仅重排用户图层，内部橡皮擦轨迹仍留在原来的合成位置。 */
  private applyLayerOrder(order: fabric.FabricObject[]) {
    let layerIndex = 0
    const merged = this.canvas
      .getObjects()
      .map((obj) => (isLayerObject(obj as AnyObject) ? order[layerIndex++] : obj))
    merged.forEach((obj, index) => this.canvas.moveObjectTo(obj, index))
  }

  /** 拖拽排序：把 dragId 移动到 targetId 之前 / 之后 */
  moveLayerTo(dragId: string, targetId: string, position: 'before' | 'after') {
    const objs = this.canvas.getObjects().filter((o) => isLayerObject(o as AnyObject))
    const drag = objs.find((o) => (o as AnyObject).layerId === dragId)
    const target = objs.find((o) => (o as AnyObject).layerId === targetId)
    if (!drag || !target || drag === target) return
    const topFirst = [...objs].reverse().filter((o) => o !== drag)
    const targetIndex = topFirst.indexOf(target)
    topFirst.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, drag)
    this.applyLayerOrder(topFirst.reverse())
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncLayers()
  }

  deleteLayer(id: string) {
    const obj = this.findById(id)
    if (!obj) return
    if (this.canvas.getActiveObjects().includes(obj as fabric.FabricObject)) {
      this.canvas.discardActiveObject()
    }
    this.canvas.remove(obj as fabric.FabricObject)
    this.canvas.requestRenderAll()
    this.pushHistoryState()
    this.syncSelection()
  }

  /**
   * 图层缩略图（用于图层面板）。
   * FabricObject.toDataURL 会临时修改对象的 canvas、位置与缓存，因此绝不能
   * 直接对正在主画布中的对象调用；先 clone，避免延迟缩略图破坏主画布对象。
   */
  async getThumbnail(id: string, size = 48): Promise<string | null> {
    const obj = this.findById(id)
    if (!obj) return null
    try {
      if (obj.isType?.('image')) {
        const image = obj as unknown as fabric.FabricImage
        const source = image.getElement()
        const sourceWidth = (source as HTMLImageElement).naturalWidth || source.width || 1
        const sourceHeight = (source as HTMLImageElement).naturalHeight || source.height || 1
        const scale = Math.min(1, size / Math.max(sourceWidth, sourceHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(sourceWidth * scale))
        canvas.height = Math.max(1, Math.round(sourceHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) return null
        context.drawImage(source, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/png')
      }

      const clone = (await obj.clone(EXTRA_PROPS)) as AnyObject
      if (this.disposing) return null
      const w = clone.getScaledWidth() || 1
      const h = clone.getScaledHeight() || 1
      const scale = Math.min(1, size / Math.max(w, h))
      clone.set({ scaleX: clone.scaleX * scale, scaleY: clone.scaleY * scale })
      clone.setCoords()
      return clone.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false } as never)
    } catch {
      return null
    }
  }

  private syncSelection() {
    if (this.disposing) return
    const store = getStore()
    const objs = this.canvas.getActiveObjects()
    store.setActiveIds(objs.map((o) => (o as AnyObject).layerId ?? ''))

    if (objs.length !== 1) {
      store.setSelection(null)
      if (objs.length === 0) store.setAdjustTarget(null)
      this.syncLayers()
      return
    }

    const obj = objs[0] as AnyObject
    const isText = !!obj.isType && obj.isType('i-text', 'text', 'textbox')
    const t = obj as unknown as fabric.IText

    const snap: SelectionSnapshot = {
      id: obj.layerId ?? '',
      type: (obj.layerType ?? 'unknown') as LayerType,
      left: Math.round(obj.left ?? 0),
      top: Math.round(obj.top ?? 0),
      width: Math.round(obj.getScaledWidth()),
      height: Math.round(obj.getScaledHeight()),
      angle: Math.round(obj.angle ?? 0),
      opacity: obj.opacity ?? 1,
      flipX: !!obj.flipX,
      flipY: !!obj.flipY,
      fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
      stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
      strokeWidth: obj.strokeWidth ?? 0,
      rx: (obj as unknown as { rx?: number }).rx ?? 0,
      text: isText ? t.text : undefined,
      fontSize: isText ? t.fontSize : undefined,
      fontFamily: isText ? t.fontFamily : undefined,
      fontWeight: isText ? (t.fontWeight as string) : undefined,
      fontStyle: isText ? t.fontStyle : undefined,
      underline: isText ? !!t.underline : undefined,
      linethrough: isText ? !!t.linethrough : undefined,
      textAlign: isText ? t.textAlign : undefined,
      lineHeight: isText ? t.lineHeight : undefined,
      charSpacing: isText ? t.charSpacing : undefined,
    }
    store.setSelection(snap)
    store.setAdjustTarget(obj.layerType === 'image' ? (obj.layerId ?? null) : null)
    this.syncLayers()
  }

  /* ------------------------------------------------------------------ */
  /* 图像调整                                                            */
  /* ------------------------------------------------------------------ */

  applyAdjustments(layerId: string, adj: Adjustments, commit = true) {
    const obj = this.findById(layerId)
    if (!obj) return
    if (!applyAdjustments(obj, adj)) return
    this.canvas.requestRenderAll()
    if (commit) this.schedulePush()
  }

  /** 撤销 / 重做后按 store 中的参数重建滤镜 */
  private reapplyAllAdjustments() {
    const map = getStore().adjustments
    this.canvas.forEachObject((o) => {
      const obj = o as AnyObject
      if (!obj.layerId || obj.layerType !== 'image') return
      if (map[obj.layerId]) applyAdjustments(obj, map[obj.layerId])
    })
  }

  resetAdjustments(layerId: string) {
    getStore().resetAdjustments(layerId)
    this.applyAdjustments(layerId, { ...DEFAULT_ADJUSTMENTS })
  }

  /* ------------------------------------------------------------------ */
  /* 裁剪                                                                */
  /* ------------------------------------------------------------------ */

  startCrop() {
    if (this.cropRect) return
    const c = this.canvas
    const pad = 0.06
    const rect = new fabric.Rect({
      left: this.docSize.width * pad,
      top: this.docSize.height * pad,
      width: this.docSize.width * (1 - pad * 2),
      height: this.docSize.height * (1 - pad * 2),
      fill: 'rgba(0,0,0,0.001)',
      stroke: '#ffffff',
      strokeWidth: 1,
      strokeDashArray: [6, 4],
      strokeUniform: true,
      borderColor: '#3d7eff',
      cornerColor: '#0b0d11',
      cornerStrokeColor: '#3d7eff',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      lockRotation: true,
      objectCaching: false,
    })
    rect.setControlsVisibility({ mtr: false })
    const typed = rect as AnyObject
    typed.isMask = true
    typed.layerId = '__crop__'

    const mkMask = () => {
      const r = new fabric.Rect({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        fill: 'rgba(8,10,14,0.66)',
        selectable: false,
        evented: false,
        objectCaching: false,
      })
      ;(r as AnyObject).isMask = true
      return r
    }
    this.cropMasks = [mkMask(), mkMask(), mkMask(), mkMask()]
    this.cropRect = rect

    c.discardActiveObject()
    this.cropMasks.forEach((m) => c.add(m))
    c.add(rect)
    c.setActiveObject(rect)
    this.updateCropMask()
    c.requestRenderAll()
  }

  private updateCropMask() {
    const rect = this.cropRect
    if (!rect || this.cropMasks.length !== 4) return
    const x = rect.left ?? 0
    const y = rect.top ?? 0
    const w = rect.getScaledWidth()
    const h = rect.getScaledHeight()
    const BIG = 1e6
    const specs: Array<[number, number, number, number]> = [
      [x - BIG, y - BIG, BIG * 2 + w, BIG],
      [x - BIG, y + h, BIG * 2 + w, BIG],
      [x - BIG, y, BIG, h],
      [x + w, y, BIG, h],
    ]
    this.cropMasks.forEach((m, i) => {
      m.set({ left: specs[i][0], top: specs[i][1], width: specs[i][2], height: specs[i][3] })
      m.setCoords()
    })
    this.canvas.requestRenderAll()
  }

  private constrainCrop() {
    const rect = this.cropRect
    if (!rect) return
    const baseW = rect.width || 1
    const baseH = rect.height || 1
    const width = clamp(rect.getScaledWidth(), 8, this.docSize.width)
    const height = clamp(rect.getScaledHeight(), 8, this.docSize.height)
    rect.set({
      left: clamp(rect.left ?? 0, 0, this.docSize.width - width),
      top: clamp(rect.top ?? 0, 0, this.docSize.height - height),
      scaleX: width / baseW,
      scaleY: height / baseH,
      angle: 0,
    })
    rect.setCoords()
  }

  cancelCrop(switchTool = true) {
    if (!this.cropRect) return
    const c = this.canvas
    c.remove(this.cropRect)
    this.cropMasks.forEach((m) => c.remove(m))
    this.cropRect = null
    this.cropMasks = []
    c.requestRenderAll()
    if (switchTool) this.setTool('select')
  }

  applyCrop() {
    const rect = this.cropRect
    if (!rect) return
    const c = this.canvas
    const x = rect.left ?? 0
    const y = rect.top ?? 0
    const w = Math.max(8, Math.round(rect.getScaledWidth()))
    const h = Math.max(8, Math.round(rect.getScaledHeight()))

    c.remove(rect)
    this.cropMasks.forEach((m) => c.remove(m))
    this.cropRect = null
    this.cropMasks = []

    c.forEachObject((o) => {
      const obj = o as AnyObject
      obj.set({ left: (obj.left ?? 0) - x, top: (obj.top ?? 0) - y })
      obj.setCoords()
    })

    this.docSize = { width: w, height: h }
    getStore().setDoc({ ...this.docSize })
    c.requestRenderAll()
    this.pushHistoryState()
    this.setTool('select')
    this.fitToScreen()
    getStore().toast('已裁剪画布', 'success')
  }

  /* ------------------------------------------------------------------ */
  /* 历史                                                                */
  /* ------------------------------------------------------------------ */

  private serialize(): Snapshot {
    const json = this.canvas.toObject(EXTRA_PROPS) as Record<string, any>
    const objects = json.objects as Array<Record<string, any>> | undefined
    if (Array.isArray(objects)) {
      json.objects = objects.filter((o) => !o.isMask && o.layerId !== '__crop__')
      ;(json.objects as Array<Record<string, any>>).forEach((o) => delete o.filters)
    }
    const adjustments = Object.fromEntries(
      Object.entries(getStore().adjustments).map(([id, adj]) => [id, { ...adj }]),
    )
    return { json, doc: { ...this.docSize }, adjustments }
  }

  private schedulePush() {
    if (this.pushTimer) window.clearTimeout(this.pushTimer)
    this.pushTimer = window.setTimeout(() => {
      this.pushTimer = null
      this.pushHistoryState()
    }, 350)
  }

  private snapshotKey(snapshot: Snapshot) {
    return JSON.stringify(snapshot, (key, value: unknown) => {
      if (key === 'src' && typeof value === 'string' && value.length > 512) {
        return `${value.length}:${value.slice(0, 64)}:${value.slice(-64)}`
      }
      return value
    })
  }

  pushHistoryState(clearFuture = true) {
    if (this.suspending || this.restoring || this.disposing) return
    if (this.pushTimer) {
      window.clearTimeout(this.pushTimer)
      this.pushTimer = null
    }
    const next = this.serialize()
    if (this.snapshotKey(next) === this.snapshotKey(this.currentSnapshot)) {
      getStore().setHistory(this.history.length > 0, this.future.length > 0)
      return
    }
    this.history.push(this.currentSnapshot)
    if (this.history.length > HISTORY_LIMIT) this.history.shift()
    this.currentSnapshot = next
    if (clearFuture) this.future = []
    getStore().setHistory(this.history.length > 0, this.future.length > 0)
  }

  undo() {
    if (!this.history.length || this.restoring) return
    this.restoring = true
    const snap = this.history.pop()!
    this.future.push(this.currentSnapshot)
    this.currentSnapshot = snap
    void this.restore(snap)
    getStore().setHistory(this.history.length > 0, this.future.length > 0)
  }

  redo() {
    if (!this.future.length || this.restoring) return
    this.restoring = true
    const snap = this.future.pop()!
    this.history.push(this.currentSnapshot)
    this.currentSnapshot = snap
    void this.restore(snap)
    getStore().setHistory(this.history.length > 0, this.future.length > 0)
  }

  private async restore(snap: Snapshot) {
    const vpt = [...this.canvas.viewportTransform] as fabric.TMat2D
    const dims = { width: this.canvas.getWidth(), height: this.canvas.getHeight() }
    try {
      if (this.pushTimer) {
        window.clearTimeout(this.pushTimer)
        this.pushTimer = null
      }
      this.suspending = true
      this.cancelCrop(false)
      this.docSize = { ...snap.doc }
      getStore().setDoc({ ...this.docSize })
      useEditorStore.setState({
        adjustments: Object.fromEntries(
          Object.entries(snap.adjustments ?? {}).map(([id, adj]) => [id, { ...adj }]),
        ),
        adjustTargetId: null,
      })
      await this.canvas.loadFromJSON(snap.json)
      this.ensureIds()
      this.reapplyAllAdjustments()
      this.canvas.setDimensions(dims)
      this.canvas.setViewportTransform(vpt)
      this.canvas.requestRenderAll()
    } catch {
      getStore().toast('状态还原失败', 'error')
    } finally {
      this.suspending = false
      this.setTool(this.tool)
      this.syncLayers()
      this.syncSelection()
      this.syncView()
      this.restoring = false
    }
  }

  private ensureIds() {
    this.canvas.forEachObject((o) => {
      const obj = o as AnyObject
      if (!isLayerObject(obj)) {
        if (obj.isEraserPath) {
          obj.selectable = false
          obj.evented = false
        }
        return
      }
      if (!obj.layerId) obj.layerId = uid('ly')
      if (!obj.layerType) obj.layerType = this.guessType(obj)
      if (!obj.layerName) obj.layerName = this.nextName(obj.layerType)
      obj.locked = obj.locked ?? false
      if (obj.layerType === 'image') obj.objectCaching = false
    })
  }

  private guessType(obj: fabric.FabricObject): LayerType {
    if (obj.isType('image')) return 'image'
    if (obj.isType('i-text', 'text', 'textbox')) return 'text'
    if (obj.isType('rect')) return 'rect'
    if (obj.isType('ellipse')) return 'ellipse'
    if (obj.isType('line')) return 'line'
    if (obj.isType('triangle')) return 'triangle'
    if (obj.isType('path')) return 'path'
    if (obj.isType('group', 'activeselection')) return 'group'
    return 'unknown'
  }

  /* ------------------------------------------------------------------ */
  /* 文档                                                                */
  /* ------------------------------------------------------------------ */

  newDocument(width = DEFAULT_DOC.width, height = DEFAULT_DOC.height) {
    if (this.pushTimer) {
      window.clearTimeout(this.pushTimer)
      this.pushTimer = null
    }
    this.suspending = true
    this.cancelCrop(false)
    this.canvas.remove(...this.canvas.getObjects())
    this.docSize = { width, height }
    getStore().setDoc({ ...this.docSize })
    useEditorStore.setState({ adjustments: {}, adjustTargetId: null })
    this.nameCounters = {}
    this.history = []
    this.future = []
    this.currentSnapshot = this.serialize()
    this.suspending = false
    getStore().setHistory(false, false)
    this.canvas.requestRenderAll()
    this.setTool('select')
    this.syncLayers()
    this.syncSelection()
    this.fitToScreen()
  }

  /* ------------------------------------------------------------------ */
  /* 导出                                                                */
  /* ------------------------------------------------------------------ */

  exportImage(opts: ExportOptions) {
    const c = this.canvas
    const vpt = [...this.canvas.viewportTransform] as fabric.TMat2D
    const dims = { width: c.getWidth(), height: c.getHeight() }
    const prevBg = c.backgroundColor

    c.renderAll()

    const { scale, width, height } = this.getExportDimensions(opts.scale)

    c.setViewportTransform([1, 0, 0, 1, 0, 0])
    c.setDimensions({ width: this.docSize.width, height: this.docSize.height })
    c.backgroundColor = opts.format === 'png' && opts.transparent ? '' : '#ffffff'
    c.renderAll()

    let dataUrl = ''
    try {
      dataUrl = c.toDataURL({
        format: opts.format,
        quality: opts.format === 'png' ? 1 : opts.quality,
        multiplier: scale,
        enableRetinaScaling: false,
      })
    } finally {
      c.backgroundColor = prevBg
      c.setDimensions(dims)
      c.setViewportTransform(vpt)
      c.requestRenderAll()
    }

    const comma = dataUrl.indexOf(',')
    const bytes = Math.max(0, Math.round((dataUrl.length - comma - 1) * 0.75))
    return {
      dataUrl,
      width,
      height,
      bytes,
    }
  }

  getExportDimensions(requestedScale: number) {
    const MAX_OUTPUT = 6000
    let scale = Math.max(0.1, requestedScale)
    const longest = Math.max(this.docSize.width, this.docSize.height) * scale
    if (longest > MAX_OUTPUT) scale = Math.max(0.1, (scale * MAX_OUTPUT) / longest)
    return {
      scale,
      width: Math.round(this.docSize.width * scale),
      height: Math.round(this.docSize.height * scale),
    }
  }

  dispose() {
    this.disposing = true
    if (this.pushTimer) window.clearTimeout(this.pushTimer)
    window.removeEventListener('resize', this.refreshCanvasOffset)
    window.removeEventListener('scroll', this.refreshCanvasOffset, true)
    void this.canvas.dispose()
  }
}
