export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "address"
  | "select"
  | "radio"
  | "checkbox"
  | "textarea"
  | "hidden";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  order?: number;
  options?: FormFieldOption[];
  helperText?: string;
  /** When true, field is shown in an "Optional" section style (e.g. frosted panel) */
  optionalSection?: boolean;
}

export interface FormSchema {
  fields: FormFieldConfig[];
}

