import { useCallback, useState } from 'react'
export type DragType = 'block' | 'field'

export interface DropIndicator {
  type: DragType
  targetId: string | null
  before: boolean
  targetBlockId?: string
}

export interface DragState {
  /** Id do elemento em arrasto (bloco ou campo). */
  draggingId: string
  /** Id do bloco de origem (igual a draggingId quando o arrasto é de bloco). */
  sourceBlockId: string
  /** Tipo do elemento em arrasto: 'block' | 'field'. */
  type: DragType
}

export interface ReorderBlocks {
  (draggedId: string, targetId: string, before: boolean): void
}

export interface ReorderFields {
  (draggedId: string, targetBlockId: string, targetFieldId: string | null, before: boolean): void
}

/**
 * Hook central de Drag and Drop (eventos nativos HTML5) do Construtor de
 * Formulários. Controla: elemento em arrasto, indicador de linha de inserção
 * (acima/abaixo do alvo) e aplicação imediata da nova ordem no estado do
 * FormBuilder — blocos são reordenados no array de topo; campos podem ser
 * reordenados dentro do bloco ou movidos para outro bloco.
 */
export function useDragReorder(reorderBlocks: ReorderBlocks, reorderFields: ReorderFields) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)

  const beginDrag = useCallback((dragState: DragState, e: React.DragEvent) => {
    if (e.button !== 0) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dragState.draggingId)
    setDrag(dragState)
    setDropIndicator(null)
  }, [])

  /** Origem do drag (alça/grip): início do arrasto de um bloco. */
  const startBlockDrag = useCallback(
    (blockId: string, e: React.DragEvent) =>
      beginDrag({ draggingId: blockId, sourceBlockId: blockId, type: 'block' }, e),
    [beginDrag],
  )

  /** Origem do drag (alça/grip): início do arrasto de um campo. */
  const startFieldDrag = useCallback(
    (blockId: string, fieldId: string, e: React.DragEvent) =>
      beginDrag({ draggingId: fieldId, sourceBlockId: blockId, type: 'field' }, e),
    [beginDrag],
  )

  /** Fim do arrasto: limpa estado e indicador (com ou sem drop bem-sucedido). */
  const endDrag = useCallback(() => {
    setDrag(null)
    setDropIndicator(null)
  }, [])

  /** dragover de um bloco: habilita o drop e calcula a linha de inserção. */
  const blockDragOver = useCallback(
    (blockId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'block') return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      setDropIndicator({ type: 'block', targetId: blockId, before })
    },
    [drag],
  )

  /** drop de um bloco: aplica a nova ordem imediatamente no estado. */
  const handleBlockDrop = useCallback(
    (targetId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'block') return
      e.preventDefault()
      e.stopPropagation()
      if (targetId !== drag.draggingId) {
        reorderBlocks(drag.draggingId, targetId, dropIndicator?.before ?? false)
      }
      setDrag(null)
      setDropIndicator(null)
    },
    [drag, dropIndicator, reorderBlocks],
  )

  /**
   * dragover de um campo alvo (qualquer campo visível no construtor):
   * habilita o drop e calcula o indicador (acima/abaixo do campo).
   */
  const fieldDragOver = useCallback(
    (targetBlockId: string, targetFieldId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'field') return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      setDropIndicator({ type: 'field', targetId: targetFieldId, before, targetBlockId })
    },
    [drag],
  )

  /** drop de um campo (pode ser em outro bloco): aplica e limpa estado. */
  const handleFieldDrop = useCallback(
    (targetBlockId: string, targetFieldId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'field') return
      e.preventDefault()
      e.stopPropagation()
      if (targetFieldId !== drag.draggingId) {
        const before = dropIndicator?.before ?? false
        reorderFields(drag.draggingId, targetBlockId, targetFieldId, before)
      }
      setDrag(null)
      setDropIndicator(null)
    },
    [drag, dropIndicator, reorderFields],
  )

  /**
   * dragover no corpo do bloco (fora de um campo): habilita soltar no fim do
   * bloco (ex.: bloco vazio ou área livre abaixo dos campos).
   */
  const blockBodyDragOver = useCallback(
    (blockId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'field' || drag.sourceBlockId === blockId) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      setDropIndicator({ type: 'field', targetId: null, before: false, targetBlockId: blockId })
    },
    [drag],
  )

  /** drop no corpo do bloco (fora de um campo): insere no fim do bloco. */
  const handleBlockBodyDrop = useCallback(
    (targetBlockId: string, e: React.DragEvent) => {
      if (!drag || drag.type !== 'field' || drag.sourceBlockId === targetBlockId) return
      e.preventDefault()
      e.stopPropagation()
      reorderFields(drag.draggingId, targetBlockId, null, false)
      setDrag(null)
      setDropIndicator(null)
    },
    [drag, reorderFields],
  )

  return {
    drag,
    dropIndicator,
    startBlockDrag,
    startFieldDrag,
    endDrag,
    blockDragOver,
    handleBlockDrop,
    fieldDragOver,
    handleFieldDrop,
    blockBodyDragOver,
    handleBlockBodyDrop,
  }
}
