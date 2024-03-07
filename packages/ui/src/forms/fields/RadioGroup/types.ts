import type { FormFieldBase } from '../shared.d.ts'

export type Props = FormFieldBase & {
  name?: string
  onChange?: OnChange
  path?: string
  value?: string
}

export type OnChange<T = string> = (value: T) => void