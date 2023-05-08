import { ApiType, Field, schemaData } from "./schema";
import { header, isNumberType, lowerFirst, urlToName } from "./utils";

const realType: Record<ApiType, string> = {
  string: "string",
  int32: "number",
  int64: "bigint",
  float: "number",
  bool: "boolean",
  map: "Record<string, unknown>",
  any: "any",
  stringArray: "string[]",
  int32Array: "number[]",
  int64Array: "bigint[]",
  floatArray: "number[]",
  anyArray: "any[]",
  boolArray: "boolean[]",
  mapArray: "Record<string, unknown>[]",
};

export function generateClient({ allSettled = false, prefixURL = "" }: { allSettled?: boolean; prefixURL?: string }) {
  let code = "";
  code += `${header}
/* eslint-disable */

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
`;

  code += `
export interface FetchOptions {
  cacheTime?:number;
}
const cache: Record<string, any> = {};

export const adapter = {
  baseCacheTime: 0,
  onError: (err:any) => {},
  onSuccess: (data:any) => {},
  fetch: async (
    { url, method, input }: { method: Method; url: string; input: any },
    options?: FetchOptions,
  ): Promise<any> => {
    const { cacheTime = adapter.baseCacheTime } = options || {};
    const key = url + method + JSON.stringify(input);
    if (cache[key]) {
      ${allSettled ? `const [res] = await cache[key];` : "const res = await cache[key];"}
      return res;
    }
    const fn = async () => {
      let out;
      let ok = false;
      if (method === "GET") {
        out = await fetch(url + "?" + new URLSearchParams(input).toString(), {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        }).then((v) => {
          ok = v.ok;
          return v.json();
        });
      } else {
        out = await fetch(url, {
          method,
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        }).then((v) => {
          ok = v.ok;
          return v.json();
        });
      }
      if (!ok) {
        adapter.onError(out);
        throw out;
      }
      adapter.onSuccess(out);
      return out;
    };
    ${allSettled ? `const promiseData = Promise.allSettled([fn()]);` : "const promiseData = fn();"}
    if (cacheTime > 0) {
      cache[key] = promiseData;
      setTimeout(() => {
        delete cache[key];
      }, cacheTime);
    }
    ${allSettled ? `const [res] = await promiseData;` : "const res = await promiseData;"}
    return res;
  },
};
    `;

  const apiNameSet = new Set<string>();
  const regCache: Record<string, string> = {};
  schemaData.forEach(async (schema) => {
    const { description, url, method, input, output } = schema;
    const apiName = urlToName(url);
    if (apiNameSet.has(apiName)) {
      throw new Error(`The ${apiName} entered is already taken. Please choose a different name.`);
    }
    apiNameSet.add(apiName);
    const inputName = `${apiName}`;
    const outputName = `${apiName}Response`;
    let newRegs = "";
    let regs = "";

    const makeType = (params: Field[], type: "" | "Response") => {
      if (!params || !params.length) {
        return;
      }

      code += `export interface ${apiName}${type} {\n`;
      let n = 0;
      const subParams = (list: Field[]) => {
        n += 2;
        let space = "";
        for (let i = 0; i < n; i++) {
          space += " ";
        }
        list.forEach((item) => {
          const inputKey = `input.${item.key}`;
          if (item.description) {
            code += `\n${space}// ${item.description}\n`;
          }
          const key = `reg_${apiName}_${item.key}`;

          if (type === "") {
            if (!item.optional) {
              if (allSettled) {
                regs += `if (${inputKey} === void 0) {
                  return { status: "rejected", reason: "Miss required: ${item.key}" } as any;
                }`;
              } else {
                regs += `if (${inputKey} === void 0) {
                  throw new Error("Miss required: ${item.key}");
                }`;
              }
            }

            if (item.min) {
              if (item.type === "string") {
                if (allSettled) {
                  regs += `if (${inputKey} === void 0 || ${inputKey}.length < ${item.min}) {
                    return { status: "rejected", reason: "Too min length: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `if (${inputKey} === void 0  || ${inputKey}.length < ${item.min}) {
                    throw new Error("Too min: ${item.key}");
                  }`;
                }
              } else if (isNumberType[item.type!]) {
                if (allSettled) {
                  regs += `if (${inputKey} === void 0  || ${inputKey} < ${item.min}) {
                    return { status: "rejected", reason: "Too min length: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `if (${inputKey} === void 0  || ${inputKey} < ${item.min}) {
                    throw new Error("Too min: ${item.key}");
                  }`;
                }
              }
            }
            if (item.max) {
              if (item.type === "string") {
                if (allSettled) {
                  regs += `if (${inputKey} === void 0 || ${inputKey}.length > ${item.max}) {
                    return { status: "rejected", reason: "Too max length: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `if (${inputKey} === void 0 || ${inputKey}.length > ${item.max}) {
                    throw new Error("Too max: ${item.key}");
                  }`;
                }
              } else if (isNumberType[item.type!]) {
                if (allSettled) {
                  regs += `if (${inputKey} === void 0  || ${inputKey} > ${item.max}) {
                    return { status: "rejected", reason: "To max length: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `if (${inputKey} === void 0  || ${inputKey} > ${item.max}) {
                    throw new Error("Too max: ${item.key}");
                  }`;
                }
              }
            }

            if (item.enum) {
              if (item.type === "string") {
                if (allSettled) {
                  regs += `if (${JSON.stringify(item.enum)}.indexOf(${inputKey}) < 0) {
                    return { status: "rejected", reason: "No in enum: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `if (${JSON.stringify(item.enum)}.indexOf(${inputKey}) < 0) {
                    throw new Error("No in enum: ${item.key}");
                  }`;
                }
              } else if (item.type === "stringArray") {
                if (allSettled) {
                  regs += `
                  const ${item.key}Set = new Set(${JSON.stringify(item.enum)});
                  if (!${inputKey}.every(v=>${item.key}Set.has(v))) {
                    return { status: "rejected", reason: "No in enum: ${item.key}" } as any;
                  }`;
                } else {
                  regs += `
                  const ${item.key}Set = new Set(${JSON.stringify(item.enum)});
                  if (!${inputKey}.every(v=>${item.key}Set.has(v))) {
                    throw new Error("No in enum: ${item.key}");
                  }`;
                }
              }
            }

            if (item.regex) {
              if (regCache[item.regex]) {
                newRegs += `const ${key} = ${regCache[item.regex]};\n`;
              } else {
                newRegs += `const ${key} = /${item.regex}/;\n`;
              }
              if (allSettled) {
                regs += `
                if (!${key}.test(${inputKey})) {
                  return { status: "rejected", reason: "Invalid format: ${item.key}" } as any;
                }`;
              } else {
                regs += `
                if (!${key}.test(${inputKey})) {
                  throw new Error("Invalid format: ${item.key}");
                }`;
              }

              regCache[item.regex] = key;
            }
          }

          if (item.typeOfObjectArray) {
            code += `${space}${item.key}${item.optional ? "?" : ""}: {\n`;
            subParams(item.typeOfObjectArray);
            code += `\n${space}}[]\n`;
          } else if (item.typeOfObject) {
            code += `${space}${item.key}${item.optional ? "?" : ""}: {\n`;
            subParams(item.typeOfObject);
            code += `\n${space}}\n`;
          } else if (item.type) {
            code += `${space}${item.key}${item.optional ? "?" : ""}:${realType[item.type]};\n`;
          }
        });
      };
      subParams(params);
      code += `\n}\n`;
    };
    makeType(input, "");
    makeType(output, "Response");

    if (description) {
      code += `\n// ${description}\n`;
    }
    code += newRegs;
    code += `export function ${lowerFirst(apiName)}(input: ${inputName}, options?:FetchOptions): ${
      allSettled ? `Promise<[PromiseSettledResult<${outputName}>][0]>` : `Promise<${outputName}>`
    } {
  ${regs}
  return adapter.fetch({
    url:"${prefixURL + url}",
    method:"${method}",
    input,
  }, options) as any;
}
${lowerFirst(apiName)}.url = "${prefixURL + url}";
${lowerFirst(apiName)}.method = "${method}";
    `;
  });
  return code;
}
