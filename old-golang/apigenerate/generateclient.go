package apigenerate

import (
	"fmt"

	"project/pkg/strx"
)

var clientRealType = map[ApiType]string{
	"string":   "string",
	"int32":    "number",
	"int64":    "bigint",
	"float":    "number",
	"bool":     "boolean",
	"map":      "Record<string, unknown>",
	"any":      "any",
	"[]string": "string[]",
	"[]int":    "number[]",
	"[]float":  "number[]",
	"[]any":    "any[]",
	"[]bool":   "boolean[]",
	"[]map":    "Record<string, unknown>[]",
}

func GenerateClient(opt *GenerateOption) string {
	code := ""
	code += `/* eslint-disable */

 export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
 `
	fetch := fmt.Sprintf(`
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
			 %v
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
		 %v
		 if (cacheTime > 0) {
			 cache[key] = promiseData;
			 setTimeout(() => {
				 delete cache[key];
			 }, cacheTime);
		 }
		 %v
		 return res;
	 },
 };`, func() string {
		if opt.AllSettled {
			return "const [res] = await cache[key];"
		} else {
			return "const res = await cache[key];"
		}
	}(), func() string {
		if opt.AllSettled {
			return "const promiseData = Promise.allSettled([fn()]);"
		} else {
			return "const promiseData = fn();"
		}
	}(), func() string {
		if opt.AllSettled {
			return "const [res] = await promiseData;"
		} else {
			return "onst res = await promiseData;"
		}
	}())
	code += fetch

	apiNameSet := map[string]any{}
	for _, schema := range schemaData {
		apiName := strx.UrlToName(schema.Url)
		if apiNameSet[apiName] != nil {
			panic(fmt.Sprintf("Api name %v is duplicated", apiName))
		}
		if len(schema.Input) == 0 {
			panic(fmt.Sprintf("need define input: %v", schema.Url))
		}
		if len(schema.Output) == 0 {
			panic(fmt.Sprintf("need define output: %v", schema.Url))
		}
		apiNameSet[apiName] = true
		inputName := apiName + "Input"
		outputName := apiName + "Output"
		makeType := func(params []Param, name string) {
			if len(params) == 0 {
				return
			}
			code += fmt.Sprintf("\nexport interface %v {\n", name)
			var n int = 0
			var subParams func(list []Param)
			subParams = func(list []Param) {
				n += 2
				space := ""
				for i := 0; i < n; i++ {
					space += " "
				}
				for _, item := range list {
					if item.Description != "" {
						code += fmt.Sprintf("%v// %v \n", space, item.Description)
					}
					if len(item.TypeOfObject) > 0 {
						code += fmt.Sprintf("%v%v%v: {\n", space, item.Name, func() string {
							if item.Optional {
								return "?"
							}
							return ""
						}())
						subParams(item.TypeOfObject)
						code += fmt.Sprintf("%v}\n", space)
					} else if len(item.TypeOfArrayObject) > 0 {
						code += fmt.Sprintf("%v%v%v: {\n", space, item.Name, func() string {
							if item.Optional {
								return "?"
							}
							return ""
						}())
						subParams(item.TypeOfArrayObject)
						code += fmt.Sprintf("%v}[]\n", space)
					} else {
						code += fmt.Sprintf("%v%v%v: %v;\n", space, item.Name, func() string {
							if item.Optional {
								return "?"
							}
							return ""
						}(), clientRealType[item.Type])
					}
				}
			}
			subParams(params)
			code += "\n}\n"
		}
		makeType(schema.Input, inputName)
		makeType(schema.Output, outputName)

		if schema.Description != "" {
			code += fmt.Sprintf("\n// %v\n", schema.Description)
		}
		realUrl := opt.PrefixUrl + schema.Url
		code += strx.TemplateFn(`export function {{ .fnName }} (input: {{ .inputName }}, options?:FetchOptions): {{ .outputType }}  {
		return adapter.fetch({
			url:"{{ .url }}",
			method:"{{ .method }}",
			input,
		}, options) as any;
	}
	{{ .fnName }}.url = "{{ .url }}";
	{{ .fnName }}.method = "{{ .method }}";
`)(map[string]any{
			"fnName":    strx.LowerFirst(apiName),
			"url":       realUrl,
			"method":    schema.Method,
			"inputName": inputName,
			"outputType": func() string {
				if opt.AllSettled {
					return fmt.Sprintf(`Promise<[PromiseSettledResult<%v>][0]>`, outputName)
				}
				return fmt.Sprintf(`Promise<%v>`, outputName)
			}(),
		})
	}

	return code
}
