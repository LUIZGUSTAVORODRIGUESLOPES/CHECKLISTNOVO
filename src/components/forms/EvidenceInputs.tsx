import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, CheckCircle2, Database, Loader2, MapPin, Navigation, PenTool } from 'lucide-react'
import { MASTER_DATA_ENTITIES, type TemplateField } from '@/types/template'
import type { GpsValue, PreviewValues, SignatureValue } from '@/components/forms/PreviewInput'

const inputClass =
  'border-slate-800 bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-600'

/* ==================== Seleção de Cadastro (master_data) ==================== */

/**
 * Select vazio com placeholder: as opções reais vêm do cadastro mestre
 * escolhido no painel de propriedades e são carregadas apenas no momento da
 * execução do formulário — aqui (preview) nenhum registro é inventado.
 */
export function MasterDataInput({
  field,
  value,
  invalid,
  onValue,
}: {
  field: TemplateField
  value: PreviewValues[string] | null
  invalid?: boolean
  onValue: (value: PreviewValues[string]) => void
}) {
  const entityLabel =
    MASTER_DATA_ENTITIES.find((e) => e.value === (field.entity ?? 'transportadora'))?.label ??
    field.entity
  return (
    <div className="space-y-1">
      <Select value={(value as string) || undefined} onValueChange={(v) => onValue(v)}>
        <SelectTrigger className={`w-full ${invalid ? 'border-red-500/80' : inputClass}`}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
          {/* Populada em tempo de execução com os registros do cadastro mestre. */}
        </SelectContent>
      </Select>
      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <Database className="mt-0.5 h-3 w-3 shrink-0" />
        As opções serão carregadas do cadastro mestre “{entityLabel}” no momento do preenchimento.
      </p>
    </div>
  )
}

/* ========================= Localização GPS (gps) ========================= */

function formatCoord(n: number, digits = 6) {
  return n.toFixed(digits)
}

export function GpsInput({
  value,
  invalid,
  onValue,
}: {
  value: PreviewValues[string] | null
  invalid?: boolean
  onValue: (value: PreviewValues[string]) => void
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const captured =
    value && typeof value === 'object' && 'latitude' in value ? (value as GpsValue) : null

  const capture = () => {
    if (!('geolocation' in navigator)) {
      setStatus('error')
      setErrorMsg('Geolocalização não é suportada neste navegador.')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onValue({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setStatus('idle')
        setErrorMsg('')
      },
      (err) => {
        setStatus('error')
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada. Habilite o acesso à localização no navegador para capturar as coordenadas.'
            : 'Não foi possível obter a localização. Verifique o sinal de GPS e tente novamente.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <div className="space-y-2">
      {captured ? (
        <div className="space-y-1 rounded-md border border-emerald-900/60 bg-emerald-950/20 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Localização capturada
          </p>
          <p className="text-[11px] text-slate-300">
            Lat.: {formatCoord(captured.latitude)} · Long.: {formatCoord(captured.longitude)}
          </p>
          <p className="text-[11px] text-slate-500">Precisão: ±{Math.round(captured.accuracy)} m</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={capture}
            disabled={status === 'loading'}
            className="h-7 gap-1.5 border-slate-700 bg-slate-950/60 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            <Navigation className="h-3 w-3" /> Capturar novamente
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={capture}
          disabled={status === 'loading'}
          className={`w-full justify-start gap-2 ${
            invalid ? 'border-red-500/80 bg-slate-950/60' : 'border-slate-700 bg-slate-950/60'
          } text-slate-200 hover:bg-slate-800`}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {status === 'loading' ? 'Obtendo localização…' : 'Capturar localização'}
        </Button>
      )}
      {status === 'error' && <p className="text-[11px] text-red-400">{errorMsg}</p>}
    </div>
  )
}

/* ======================= Foto / Câmera (photo) ======================= */

export function PhotoInput({
  value,
  invalid,
  onValue,
}: {
  value: PreviewValues[string] | null
  invalid?: boolean
  onValue: (value: PreviewValues[string]) => void
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Revoga o object URL anterior ao trocar de arquivo ou desmontar.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  const pick = (file: File | null) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    if (!file) {
      setObjectUrl(null)
      onValue(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    onValue({ fileName: file.name, size: file.size, mimeType: file.type, _localUrl: url })
  }

  const hasPhoto = !!objectUrl
  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className={`w-full justify-start gap-2 ${
          invalid && !hasPhoto ? 'border-red-500/80' : 'border-slate-700'
        } bg-slate-950/60 text-slate-200 hover:bg-slate-800`}
      >
        <Camera className="h-4 w-4" /> {hasPhoto ? 'Trocar foto' : 'Tirar / escolher foto'}
      </Button>
      {hasPhoto && (
        <div className="space-y-1">
          <img
            src={objectUrl}
            alt="Pré-visualização da foto capturada"
            className="max-h-40 w-auto rounded-md border border-slate-800 object-contain"
          />
          <p className="text-[11px] text-slate-500">
            Foto carregada localmente (apenas pré-visualização).
          </p>
        </div>
      )}
    </div>
  )
}

/* ======================= Assinatura Digital (signature) ======================= */

export function SignatureInput({
  value,
  invalid,
  onValue,
}: {
  value: PreviewValues[string] | null
  invalid?: boolean
  onValue: (value: PreviewValues[string]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasStrokesRef = useRef(false)
  const [signed, setSigned] = useState(
    !!(
      value &&
      typeof value === 'object' &&
      'strokes' in value &&
      (value as SignatureValue).strokes > 0
    ),
  )

  const pointFrom = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointFrom(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (!p || !ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const p = pointFrom(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (!p || !ctx) return
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasStrokesRef.current) {
      hasStrokesRef.current = true
      setSigned(true)
      onValue({ strokes: 1, signedAt: new Date().toISOString() })
    }
  }

  const end = () => {
    drawingRef.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokesRef.current = false
    setSigned(false)
    onValue(null)
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className={`h-32 w-full touch-none rounded-md border bg-slate-950/60 ${
          invalid && !signed ? 'border-red-500/80' : 'border-slate-700'
        } cursor-crosshair`}
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          className="h-7 gap-1.5 border-slate-700 bg-slate-950/60 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          <PenTool className="h-3 w-3" /> Limpar
        </Button>
        {signed ? (
          <Badge variant="outline" className="border-emerald-800 text-[10px] text-emerald-300">
            <CheckCircle2 className="mr-1 h-3 w-3" /> assinado ✓
          </Badge>
        ) : (
          <span className="text-[11px] text-slate-500">
            Assine no espaço acima com mouse ou toque.
          </span>
        )}
      </div>
    </div>
  )
}
