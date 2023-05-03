package apigenerate

type ApiType string

const (
	String      ApiType = "string"
	Int         ApiType = "int32"
	BigInt      ApiType = "int64"
	Bool        ApiType = "bool"
	Float       ApiType = "float"
	Map         ApiType = "map"
	Any         ApiType = "any"
	StringArray ApiType = "[]string"
	IntArray    ApiType = "[]int"
	AnyArray    ApiType = "[]any"
	BoolArray   ApiType = "[]any"
	FloatArray  ApiType = "[]float"
	MapArray    ApiType = "[]map"
)

type Method string

const (
	GET    Method = "GET"
	POST   Method = "POST"
	PUT    Method = "PUT"
	PATCH  Method = "PATCH"
	DELETE Method = "DELETE"
)

type Param struct {
	Name              string
	Description       string
	TypeOfObject      []Param
	TypeOfArrayObject []Param
	Type              ApiType
	Optional          bool
	Min               int
	Max               int
	Regex             string
	Pick              []string
}

type Schema struct {
	Description string
	Url         string
	Method      Method
	Input       []Param
	Output      []Param
}

var schemaData []Schema = []Schema{}

func AddSchema(schema Schema) {
	schemaData = append(schemaData, schema)
}
