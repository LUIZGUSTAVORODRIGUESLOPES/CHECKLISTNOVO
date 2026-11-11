import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatRegistryValue, registryPlaceholder, validateRegistryValue } from '@/lib/masks'
import type { RegistryMask } from '@/types/template'

/**
 * Input com máscara progressiva (as-you-type) e validação visual imediata.
 * Ao perder o foco incompleto/inválido, aplica borda vermelha e mensagem
 * de alerta logo abaixo do campo.
 */
export function RegistryInput({
  mask,
  value,
  onChange,
  onValidityChange,
  className,
}: {
  mask: RegistryMask
  value: string
  onChange: (masked: string) => void
  onValidityChange?: (valid: boolean) => void
  className?: string
}) {
  const [touched, setTouched] = useState(false)
  const [blurredInvalid, setBlurredInvalid] = useState(false)
  const validation = validateRegistryValue(mask, value)
  const isValid = validation.state !== 'invalid'

  const handleChange = (text: string) => {
    const masked = formatRegistryValue(mask, text)
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

  const showError = touched && blurredInvalid
  const errorText = validation.message || 'Formato incompleto'
  const inputClass = showError
    ? `border-red-500/80 focus-visible:ring-red-500/40 ${className ?? ''}`
    : (className ?? '')

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={registryPlaceholder(mask)}
        className={inputClass}
        aria-invalid={showError}
      />
      {showError && <p className="text-[11px] text-red-400">{errorText}</p>}
    </div>
  )
}
