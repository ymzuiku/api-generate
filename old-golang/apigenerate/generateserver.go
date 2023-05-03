package apigenerate

import (
	"fmt"
	"path"
	"strings"

	"project/pkg/strx"
)

var serverRealType = map[ApiType]string{
	"string":   "string",
	"int32":    "int32",
	"int64":    "int64",
	"float":    "float64",
	"bool":     "bool",
	"map":      "map[string]any",
	"any":      "any",
	"[]string": "[]string",
	"[]int":    "[]int32",
	"[]float":  "[]float64",
	"[]any":    "[]any",
	"[]bool":   "[]bool",
	"[]map":    "[]map[string]any",
}

func GenerateServer(opt *GenerateOption) string {
	code := ""
	list := strings.Split(path.Dir(opt.ServerFile), "/")
	dirName := list[len(list)-1]
	code += fmt.Sprintf(`package %v

import "github.com/gin-gonic/gin"
	`, dirName)

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
			code += fmt.Sprintf("\ntype %v struct {\n", strx.UpperFirst(name))
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
						code += fmt.Sprintf("%v%v struct {\n", space, strx.UpperFirst(item.Name))
						subParams(item.TypeOfObject)
						code += fmt.Sprintf("\n%v}\n", space)
					} else if len(item.TypeOfArrayObject) > 0 {
						code += fmt.Sprintf("%v%v []struct {\n", space, strx.UpperFirst(item.Name))
						subParams(item.TypeOfArrayObject)
						code += fmt.Sprintf("\n%v}\n", space)
					} else {
						code += fmt.Sprintf("%v%v %v `json:\"%v\" binding:\"%v\"` \n", space, strx.UpperFirst(item.Name), serverRealType[item.Type], item.Name, func() string {
							if item.Optional {
								return ""
							}
							return "required"
						}())
					}
				}
			}
			subParams(params)
			code += "\n}\n"
		}
		makeType(schema.Input, inputName)
		makeType(schema.Output, outputName)
	}

	// make Apis
	code += "type Apis interface {\n"
	for _, schema := range schemaData {
		apiName := strx.UrlToName(schema.Url)
		inputName := apiName + "Input"
		outputName := apiName + "Output"
		if schema.Description != "" {
			code += fmt.Sprintf("\n// %v\n", schema.Description)
		}
		code += fmt.Sprintf("%v(input *%v) *%v\n", apiName, inputName, outputName)
	}
	code += "\n}\n"

	// make BindHandles
	code += "func BindHandles(r *gin.Engine, apis Apis) {\n"
	for _, schema := range schemaData {
		apiName := strx.UrlToName(schema.Url)
		realUrl := opt.PrefixUrl + schema.Url
		inputName := apiName + "Input"
		code += fmt.Sprintf(`r.%v("%v", func(c *gin.Context) {
			var input %v
			if err := c.%v(&input); err != nil {
				c.JSON(400, map[string]any{"error": err.Error()})
				return
			}
			out := apis.%v(&input)
			c.JSON(200, out)
		})
				`, schema.Method, realUrl, inputName, func() string {
			if schema.Method == "GET" {
				return "ShouldBindQuery"
			}
			return "ShouldBindJSON"
		}(), apiName)
	}
	code += "\n}\n"

	return code
}
