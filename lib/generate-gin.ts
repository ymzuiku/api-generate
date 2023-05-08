import { ApiType, Field, schemaData } from "./schema";
import { header, isNumberType, upperFirst, urlToName } from "./utils";

const arrayMap: Record<ApiType, string> = {
  stringArray: true,
  int32Array: true,
  int64Array: true,
  floatArray: true,
  anyArray: true,
  boolArray: true,
  mapArray: true,
} as unknown as Record<ApiType, string>;

const realType: Record<ApiType, string> = {
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

import (
	"errors"
	"regexp"

	"github.com/gin-gonic/gin"
)

var ErrNoDefinedRouter = errors.New("No defined router")

func allElementsInArr(a, b []string) bool {
	bMap := make(map[string]bool)
	for _, x := range b {
		bMap[x] = true
	}
	for _, x := range a {
		if !bMap[x] {
			return false
		}
	}
	return true
}
  `;

  const apiNameSet = new Set<string>();
  let newRegs = "";
  const regCache: Record<string, string> = {};
  const routerRegs: Record<string, string> = {};
  schemaData.forEach(async (schema) => {
    const { url, input, output } = schema;
    const apiName = urlToName(url);
    if (apiNameSet.has(apiName)) {
      throw new Error(`The ${apiName} entered is already taken. Please choose a different name.`);
    }
    apiNameSet.add(apiName);

    const makeType = (params: Field[], type: "" | "Response") => {
      if (!params || !params.length) {
        return;
      }

      code += `
type ${upperFirst(apiName)}${type} struct {\n`;
      let n = 0;
      const subParams = (list: Field[]) => {
        n += 2;
        let space = "";
        for (let i = 0; i < n; i++) {
          space += " ";
        }
        list.forEach((item) => {
          let regKey = "";
          const inputKey = `input.${upperFirst(item.key)}`;
          if (!routerRegs[apiName]) {
            routerRegs[apiName] = "";
          }

          if (type === "") {
            if (!item.optional) {
              if (item.type === "string") {
                routerRegs[apiName] += `if ${inputKey} == "" {
                  c.JSON(400, map[string]any{"error": "Miss required: ${item.key}"})
                  return 
                }\n`;
              } else if (isNumberType[item.type!]) {
                routerRegs[apiName] += `if int64(${inputKey}) == int64(0) {
                  c.JSON(400, map[string]any{"error": "Miss required: ${item.key}"})
                  return 
                }\n`;
              } else if (arrayMap[item.type!]) {
                routerRegs[apiName] += `if len(${inputKey}) == 0 {
                  c.JSON(400, map[string]any{"error": "Miss required: ${item.key}"})
                  return 
                }\n`;
              }
            }

            if (item.min) {
              if (item.type === "string") {
                routerRegs[apiName] += `if  len(${inputKey}) < ${item.min} {
                  c.JSON(400, map[string]any{"error": "Too min length: ${item.key}"})
                  return 
                }\n`;
              } else if (isNumberType[item.type!]) {
                routerRegs[apiName] += `if ${inputKey} < ${item.min} {
                  c.JSON(400, map[string]any{"error": "Too min: ${item.key}"})
                  return 
                }\n`;
              }
            }
            if (item.max) {
              if (item.type === "string") {
                routerRegs[apiName] += `if  len(${inputKey}) > ${item.max} {
                  c.JSON(400, map[string]any{"error": "Too max length: ${item.key}"})
                  return 
                }`;
              } else if (isNumberType[item.type!]) {
                routerRegs[apiName] += `if ${inputKey} > ${item.max} {
                  c.JSON(400, map[string]any{"error": "Too max: ${item.key}"})
                  return 
                }\n`;
              }
            }

            if (item.enum) {
              if (item.type === "string") {
                routerRegs[apiName] += `
                ${item.key}Arr := []string{${JSON.stringify(item.enum).replace(/\[|\]/g, "")}}
                if allElementsInArr([]string{${inputKey}}, ${item.key}Arr) {
                  c.JSON(400, map[string]any{"error": "No in enum: ${item.key}"})
                  return 
                }\n`;
              } else if (item.type === "stringArray") {
                routerRegs[apiName] += `
                ${item.key}Arr := []string{${JSON.stringify(item.enum).replace(/\[|\]/g, "")}}
                if allElementsInArr(${inputKey}, ${item.key}Arr) {
                  c.JSON(400, map[string]any{"error": "No in enum: ${item.key}"})
                  return 
                }\n`;
              }
            }
            if (item.regex) {
              regKey = `reg_${apiName}_${item.key}`;

              if (!regCache[item.regex]) {
                newRegs += `var ${regKey} = regexp.MustCompile(\`${item.regex}\`)\n`;
                regCache[item.regex] = regKey;
              }

              routerRegs[apiName] += `
                if !${regCache[item.regex]}.MatchString(${inputKey}) {
                  c.JSON(400, map[string]any{"error": "Invalid format: ${item.key}"})
                  return 
                }\n
              `;
            }
          }

          if (item.description) {
            code += `${space}// ${item.description}\n`;
          }
          if (item.typeOfObjectArray) {
            code += `${space}${upperFirst(item.key)} []struct {\n`;
            subParams(item.typeOfObjectArray);
            code += `\n${space}}\n`;
          } else if (item.typeOfObject) {
            code += `${space}${upperFirst(item.key)} struct {\n`;
            subParams(item.typeOfObject);
            code += `\n${space}}\n`;
          } else if (item.type) {
            code += `${space}${upperFirst(item.key)} ${realType[item.type]} \`json:"${item.key}"\`\n`;
          }
        });
      };
      subParams(params);
      code += `\n}\n`;
    };
    makeType(input, "");
    makeType(output, "Response");
  });

  code += `type RouterList struct {\n`;
  schemaData.forEach(async (schema) => {
    const { description, url } = schema;
    const apiName = urlToName(url);
    const inputName = `${apiName}`;
    const outputName = `${apiName}Response`;
    if (description) {
      code += `// ${description}\n`;
    }
    code += `${apiName} func(input *${inputName}) (*${outputName}, error)\n`;
  });

  // Hello(input HelloInput) HelloOutput
  code += `
  \n}\n
  var Routers = &RouterList{}\n
  `;

  // bind-require
  code += newRegs;
  code += `func BindHandles(r *gin.Engine) {\n`;

  schemaData.forEach(async (schema) => {
    const { method, url } = schema;
    const apiName = urlToName(url);
    const inputName = `${apiName}`;

    if (method === "GET") {
      code += `r.${method}("${prefixURL + url}", func(c *gin.Context) {
        var input ${inputName}
        if err := c.ShouldBindQuery(&input); err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        ${routerRegs[apiName]}
        out, err := Routers.${apiName}(&input)
        if err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        c.JSON(200, out)
      })\n
      `;
    } else {
      code += `r.${method}("${prefixURL + url}", func(c *gin.Context) {
        var input ${inputName}
        if err := c.ShouldBindJSON(&input); err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        ${routerRegs[apiName]}
        out, err := Routers.${apiName}(&input)
        if err != nil {
          c.JSON(400, map[string]any{"error": err.Error()})
          return
        }
        c.JSON(200, out)
      })\n
      `;
    }
  });

  code += `\n}\n`;
  return code;
}
