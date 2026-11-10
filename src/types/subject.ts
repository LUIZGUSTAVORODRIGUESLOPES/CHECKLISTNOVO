import type { DepartmentRecord } from '@/types/department'

export interface SubjectRecord {
  id: string
  name: string
  description: string
  department_id: string
  active: boolean
  created: string
  updated: string
}
