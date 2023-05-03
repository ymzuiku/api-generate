type Method = "POST" | "GET" | "DELETE" | "PUT" | "PATCH";

export type ApiSignalType =
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

export type ApiType = ApiSignalType | Param[];

export interface Param {
  name: string;
  description?: string;
  type: ApiType;
  optional?: boolean;
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
