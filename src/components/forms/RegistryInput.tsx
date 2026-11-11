import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  formatRegistryValue,
  registryMaxLength,
  registryPlaceholder,
  validateRegistryValue,
} from '@/lib/masks'
import type { RegistryMask } from '@/types/template'

/**
 * Input com máscara progressiva (as-you-type) e travamento físico de
 * caracteres (maxLength da máscara — ex.: CEP 9, CPF 14, CNPJ 18, placa 8).
 * Ao perder o foco incompleto/inválido, aplica borda vermelha e mensagem
 * de alerta logo abaixo do campo.
 */
export function RegistryInput({
  mask,
  value,
  onChange,
  onValidityChange,
  className,
  forceError,
}: {
  mask: RegistryMask
  value: string
  onChange: (masked: string) => void
  onValidityChange?: (valid: boolean) => void
  className?: string
  /** Erro externo (checagem de submissão) — mostra alerta mesmo sem blur. */
  forceError?: boolean
}) {
  const [touched, setTouched] = useState(false)
  const [blurredInvalid, setBlurredInvalid] = useState(false)
  const validation = validateRegistryValue(mask, value)
  const maxLength = registryMaxLength(mask)
  const showError = forceError || (touched && blurredInvalid)
  const errorText = validation.message || 'Formato incompleto'
  const inputClass = showError
    ? `border-red-500/80 focus-visible:ring-red-500/40 ${className ?? ''}`
    : (className ?? '')

  const handleChange = (text: string) => {
    // Travamento: o valor já entra cortado no limite da máscara, então mesmo
    // colar/autocompletar não ultrapassa o tamanho do formato.
    const masked = formatRegistryValue(mask, text).slice(0, maxLength)
    onChange(masked)
    // Qualquer digitação nova "resolve" o estado de erro do blur.
    setBlurredInvalid(false)
    onValidityChange?.(validateRegistryValue(mask, masked).state !== 'invalid')
  }

  const handleBlur = () => {
    setTouched(true)
    const state = validateRegistryValue(mask, value).state
    setBlurredInvalid(state !== 'ok')
    onValidityChange?.(state !== 'invalid')
  }

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={registryPlaceholder(mask)}
        className={inputClass}
        aria-invalid={showError}
        maxLength={maxLength}
      />
      {showError && <p className="text-[11px] text-red-400">{errorText}</p>}
    </div>
  )
}
