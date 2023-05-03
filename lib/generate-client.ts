import { Param, schemaData } from "./schema";
import { lowerFirst, urlToName } from "./utils";

const realType = {
  string: "string",
  int: "number",
  float: "number",
  bool: "boolean",
  map: "Record<string, unknown>",
  any: "any",
  "[]string": "string[]",
  "[]int": "number[]",
  "[]float": "number[]",
  "[]any": "any[]",
  "[]bool": "boolean[]",
  "[]map": "Record<string, unknown>[]",
};

export function generateClient({ allSettled = false, prefixURL = "" }: { allSettled?: boolean; prefixURL?: string }) {
  let code = "";
  code += `/* eslint-disable @typescript-eslint/no-unused-vars */
  /* eslint-disable @typescript-eslint/no-empty-interface */
  /* eslint-disable @typescript-eslint/no-explicit-any */

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
        out = await fetch(input.url, {
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
  schemaData.forEach(async (schema) => {
    const { description, url, method, input, output } = schema;
    const apiName = urlToName(url);
    if (apiNameSet.has(apiName)) {
      throw new Error(`The ${apiName} entered is already taken. Please choose a different name.`);
    }
    apiNameSet.add(apiName);
    const inputName = `${apiName}Input`;
    const outputName = `${apiName}Output`;

    const makeType = (params: Param[], type: "Input" | "Output") => {
      if (!params || !params.length) {
        return;
      }

      code += `export interface ${apiName}${type} {\n`;
      let n = 0;
      const subParams = (list: Param[]) => {
        n += 2;
        let space = "";
        for (let i = 0; i < n; i++) {
          space += " ";
        }
        list.forEach((item) => {
          if (item.description) {
            code += `${space}// ${item.description}\n`;
          }
          if (Array.isArray(item.type)) {
            code += `${space}${item.name}${item.options ? "?" : ""}: {\n`;
            subParams(item.type);
            code += `\n${space}}\n`;
          } else {
            code += `${space}${item.name}${item.options ? "?" : ""}:${realType[item.type]};\n`;
          }
        });
      };
      subParams(params);
      code += `\n}\n`;
    };
    makeType(input, "Input");
    makeType(output, "Output");

    if (description) {
      code += `// ${description}\n`;
    }
    code += `export function ${lowerFirst(apiName)}(input: ${inputName}, options?:FetchOptions): ${
      allSettled ? `Promise<[PromiseSettledResult<${outputName}>][0]>` : `Promise<${outputName}>`
    } {
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
