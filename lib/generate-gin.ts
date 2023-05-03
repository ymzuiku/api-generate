import { ApiSignalType, Param, schemaData } from "./schema";
import { header, upperFirst, urlToName } from "./utils";

const realType: Record<ApiSignalType, string> = {
  string: "string",
  int32: "int32",
  int64: "int64",
  float: "float64",
  bool: "bool",
  map: "map[string]any",
  any: "any",
  stringArray: "[]string",
  int32Array: "[]int32",
  int64Array: "[]int64",
  floatArray: "[]float64",
  anyArray: "[]any",
  boolArray: "[]bool",
  mapArray: "[]map[string]any",
};

export function ginServer({ dir, prefixURL = "" }: { dir: string; prefixURL?: string }) {
  const list = dir.split("/");
  const dirName = list[list.length - 1];
  let code = "";
  code += `${header}
package ${dirName}\n

import "github.com/gin-gonic/gin"\n
  `;

  const apiNameSet = new Set<string>();
  schemaData.forEach(async (schema) => {
    const { url, input, output } = schema;
    const apiName = urlToName(url);
    if (apiNameSet.has(apiName)) {
      throw new Error(`The ${apiName} entered is already taken. Please choose a different name.`);
    }
    apiNameSet.add(apiName);

    const makeType = (params: Param[], type: "Input" | "Output") => {
      if (!params || !params.length) {
        return;
      }

      code += `
type ${upperFirst(apiName)}${type} struct {\n`;
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
            code += `${space}${upperFirst(item.name)} struct {\n`;
            subParams(item.type);
            code += `\n${space}}\n`;
          } else {
            code += `${space}${upperFirst(item.name)} ${realType[item.type]} \`json:"${item.name}" binding:"${
              item.options ? "" : "required"
            }"\`\n`;
          }
        });
      };
      subParams(params);
      code += `\n}\n`;
    };
    makeType(input, "Input");
    makeType(output, "Output");
  });

  code += `type Apis interface {\n`;
  schemaData.forEach(async (schema) => {
    const { description, url } = schema;
    const apiName = urlToName(url);
    const inputName = `${apiName}Input`;
    const outputName = `${apiName}Output`;
    if (description) {
      code += `// ${description}\n`;
    }
    code += `${apiName}(input *${inputName}) *${outputName}\n`;
  });
  // Hello(input HelloInput) HelloOutput
  code += "\n}\n";
  code += `func BindHandles(r *gin.Engine, apis Apis) {\n`;
  schemaData.forEach(async (schema) => {
    const { method, url } = schema;
    const apiName = urlToName(url);
    const inputName = `${apiName}Input`;

    if (method === "GET") {
      code += `r.${method}("${prefixURL + url}", func(c *gin.Context) {
        var input ${inputName}
        if err := c.ShouldBindQuery(&input); err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        out := apis.${apiName}(&input)
        c.JSON(200, out)
      })
      `;
    } else {
      code += `r.${method}("${prefixURL + url}", func(c *gin.Context) {
        var input ${inputName}
        if err := c.ShouldBindJSON(&input); err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        out := apis.${apiName}(&input)
        c.JSON(200, out)
      })
      `;
    }
  });

  code += `\n}\n`;
  return code;
}
