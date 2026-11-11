import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Palette, FileText } from 'lucide-react'
import { PDF_COLOR_PRESETS, type TemplatePdfDesign } from '@/lib/templateConfig'

interface PdfDesignTabProps {
  pdfDesign: TemplatePdfDesign
  onChange: (next: TemplatePdfDesign) => void
}

const HEX_RE = /^#[0-9a-fA-F]{0,6}$/

/**
 * Aba "Design do PDF": customização visual do relatório impresso/PDF do
 * checklist. Por enquanto apenas configuração persistida — o relatório
 * executivo em si será gerado no Executor, no futuro.
 */
export function PdfDesignTab({ pdfDesign, onChange }: PdfDesignTabProps) {
  const setColor = (raw: string) => {
    // Aceita digitação parcial (ex.: "#25") sem quebrar o input; a
    // normalização final acontece no payload (buildBlocksPayload).
    if (!HEX_RE.test(raw)) return
    onChange({ ...pdfDesign, primaryColor: raw })
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Palette className="h-4 w-4" /> Aparência do Relatório
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-primary-color">Cor primária do cabeçalho</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PDF_COLOR_PRESETS.map((p) => {
                const isActive = pdfDesign.primaryColor.toLowerCase() === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={isActive}
                    title={p.label}
                    onClick={() => onChange({ ...pdfDesign, primaryColor: p.value })}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-950/60 text-blue-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-slate-600"
                      style={{ backgroundColor: p.value }}
                    />
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                aria-label="Seletor de cor primária"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(pdfDesign.primaryColor)
                    ? pdfDesign.primaryColor
                    : '#000000'
                }
                onChange={(e) => onChange({ ...pdfDesign, primaryColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
              />
              <Input
                id="pdf-primary-color"
                value={pdfDesign.primaryColor}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2563eb"
                className="w-32 bg-slate-950 border-slate-800 text-slate-100 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-show-logo"
                checked={pdfDesign.showLogo}
                onCheckedChange={(v) => onChange({ ...pdfDesign, showLogo: v })}
              />
              <Label htmlFor="pdf-show-logo" className="cursor-pointer font-normal">
                Exibir logotipo da Globex no cabeçalho
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-footer"
                checked={pdfDesign.footerDatetime}
                onCheckedChange={(v) => onChange({ ...pdfDesign, footerDatetime: v })}
              />
              <Label htmlFor="pdf-footer" className="cursor-pointer font-normal">
                Rodapé com data/hora de emissão
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-pagination"
                checked={pdfDesign.pagination}
                onCheckedChange={(v) => onChange({ ...pdfDesign, pagination: v })}
              />
              <Label htmlFor="pdf-pagination" className="cursor-pointer font-normal">
                Paginação (página X de Y)
              </Label>
            </div>
          </div>

          <p className="rounded-md border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-500">
            <FileText className="mr-1 inline h-3 w-3" />
            Prévia do cabeçalho do relatório com a cor escolhida — o PDF executivo em si será gerado
            pelo Executor de preenchimento, no futuro.
          </p>

          {/* Prévia estática do cabeçalho com a cor primária */}
          <div
            className="flex items-center gap-3 rounded-md p-3"
            style={{
              backgroundColor: /^#[0-9a-fA-F]{6}$/.test(pdfDesign.primaryColor)
                ? pdfDesign.primaryColor
                : '#334155',
            }}
          >
            {pdfDesign.showLogo && (
              <div className="flex h-9 w-9 items-center justify-center rounded bg-white/90 text-[10px] font-black text-slate-800">
                GX
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">Relatório de Auditoria</div>
              <div className="text-[10px] text-white/70">
                Gestão de Auditorias Logísticas Globex
              </div>
            </div>
          </div>
          {(pdfDesign.footerDatetime || pdfDesign.pagination) && (
            <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[10px] text-slate-500">
              <span>{pdfDesign.footerDatetime ? 'Emitido em 01/01/2026 12:00' : ''}</span>
              <span>{pdfDesign.pagination ? 'Página 1 de 1' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
