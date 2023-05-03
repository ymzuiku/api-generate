package apigenerate

import (
	"os/exec"
	"strings"

	"project/pkg/fsx"
)

type GenerateOption struct {
	ClientFile   string
	ServerFile   string
	PrefixUrl    string
	AllSettled   bool
	ServerFormat string
	ClientFormat string
}

func execStr(str string) error {
	args := strings.Split(str, " ")
	return exec.Command(args[0], args[1:]...).Run()
}

func Generate(opt GenerateOption) {
	if opt.ClientFile != "" {
		println("write: ", opt.ClientFile)
		if err := fsx.WriteToFile(opt.ClientFile, GenerateClient(&opt)); err != nil {
			panic(err)
		}
		if opt.ClientFormat != "" {
			str := strings.Replace(opt.ClientFormat, "$file", opt.ClientFile, 5)
			if err := execStr(str); err != nil {
				panic(err)
			}
		}
	}
	if opt.ServerFile != "" {
		println("write: ", opt.ServerFile)
		if err := fsx.WriteToFile(opt.ServerFile, GenerateServer(&opt)); err != nil {
			panic(err)
		}
		if opt.ServerFormat != "" {
			str := strings.Replace(opt.ServerFormat, "$file", opt.ServerFile, 5)
			if err := execStr(str); err != nil {
				panic(err)
			}
		}
	}
}
