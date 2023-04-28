type Method = "POST" | "GET" | "DELETE" | "PUT" | "PATCH";

export type ApiType =
  | "string"
  | "int"
  | "bool"
  | "float"
  | "map"
  | "any"
  | "[]string"
  | "[]int"
  | "[]any"
  | "[]bool"
  | "[]float"
  | "[]map"
  | Param[];

export interface Param {
  name: string;
  description?: string;
  type: ApiType;
  options?: boolean;
  min?: number;
  max?: number;
  regex?: string;
  pick?: string[];
}

export const schemaData: Schema[] = [];

interface Schema {
  description?: string;
  url: string;
  method: Method;
  input: Param[];
  output: Param[];
}

export function schema(data: Schema) {
  schemaData.push(data);
}
