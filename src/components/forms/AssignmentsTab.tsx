import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Building2 } from 'lucide-react'
import type { DepartmentRecord } from '@/types/department'
import type { TemplateAssignments } from '@/lib/templateConfig'

interface AssignmentsTabProps {
  assignments: TemplateAssignments
  departments: DepartmentRecord[]
  onChange: (next: TemplateAssignments) => void
}

/**
 * Aba "Atribuições": define se o checklist fica disponível para todos os
 * operadores (OPERATOR) ou restrito a departamentos específicos.
 */
export function AssignmentsTab({ assignments, departments, onChange }: AssignmentsTabProps) {
  // Departamentos ativos (mais o atualmente selecionado, para não sumir da lista).
  const selectableDepartments = useMemo(
    () => departments.filter((d) => d.active || assignments.departmentIds.includes(d.id)),
    [departments, assignments.departmentIds],
  )

  const setScope = (scope: TemplateAssignments['scope']) => {
    if (scope === 'all') {
      onChange({ scope: 'all', departmentIds: [] })
    } else {
      onChange({ scope: 'departments', departmentIds: assignments.departmentIds })
    }
  }

  const toggleDepartment = (id: string) => {
    const list = assignments.departmentIds
    onChange({
      ...assignments,
      departmentIds: list.includes(id) ? list.filter((d) => d !== id) : [...list, id],
    })
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-800 bg-slate-900/50 text-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4" /> Disponibilidade do Checklist
          </div>
          <RadioGroup
            value={assignments.scope}
            onValueChange={(v) => setScope(v as TemplateAssignments['scope'])}
            className="gap-3"
          >
            <label
              htmlFor="assign-all"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                assignments.scope === 'all'
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <RadioGroupItem id="assign-all" value="all" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-100">Todos os operadores</div>
                <p className="text-xs text-slate-400">
                  O checklist fica disponível para todo usuário com perfil OPERATOR.
                </p>
              </div>
            </label>
            <label
              htmlFor="assign-departments"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                assignments.scope === 'departments'
                  ? 'border-blue-500 bg-blue-950/20'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <RadioGroupItem id="assign-departments" value="departments" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-100">Departamentos específicos</div>
                <p className="text-xs text-slate-400">
                  Restringe o checklist aos operadores dos departamentos selecionados.
                </p>
              </div>
            </label>
          </RadioGroup>

          {assignments.scope === 'departments' && (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Departamentos (múltipla escolha)
                </Label>
              </div>
              {selectableDepartments.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Nenhum departamento ativo cadastrado. Cadastre departamentos para restringir a
                  disponibilidade.
                </p>
              ) : (
                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {selectableDepartments.map((d) => {
                    const checked = assignments.departmentIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? 'border-blue-500 bg-blue-950/20 text-slate-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleDepartment(d.id)}
                        />
                        <span className="truncate">{d.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-slate-500">
                {assignments.departmentIds.length === 0
                  ? 'Nenhum departamento selecionado — selecione ao menos um para restringir.'
                  : `${assignments.departmentIds.length} departamento(s) selecionado(s).`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
