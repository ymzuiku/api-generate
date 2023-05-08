type Method = "POST" | "GET" | "DELETE" | "PUT" | "PATCH";

export type ApiType =
  | "string"
  | "int32"
  | "int64"
  | "bool"
  | "float"
  | "map"
  | "any"
  | "stringArray"
  | "int32Array"
  | "int64Array"
  | "anyArray"
  | "boolArray"
  | "floatArray"
  | "mapArray";

export interface Field {
  key: string;
  description?: string;
  type?: ApiType;
  typeOfObject?: Field[];
  typeOfObjectArray?: Field[];
  optional?: boolean;
  regex?: string;
  enum?: string[];
  min?: number;
  max?: number;
}

export const schemaData: Schema[] = [];

interface Schema {
  description?: string;
  url: string;
  method: Method;
  input: Field[];
  output: Field[];
}

export function schema(data: Schema) {
  schemaData.push(data);
}
