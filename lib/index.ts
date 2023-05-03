import fs from "fs-extra";
import path from "path";
import { cwd } from "process";
import { generateClient } from "./generate-client";
import { ginServer } from "./generate-gin";
import { execCli } from "./utils";

export * from "./schema";

export function generate({
  clientFile,
  clientFormat,
  ginFile,
  ginFormat,
  actixWebFile,
  prefixURL,
  allSettled,
}: {
  // web-client
  clientFile?: string;
  clientFormat?: string;
  allSettled?: boolean;
  // go-gin
  ginFile?: string;
  ginFormat?: string;
  // rust-actix-web
  actixWebFile?: string;
  actixWebFormat?: string;
  // options
  prefixURL?: string;
}) {
  if (clientFile) {
    const filename = path.resolve(cwd(), clientFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFileSync(filename, generateClient({ allSettled, prefixURL: prefixURL }));
    if (clientFormat) {
      execCli(clientFormat.replace("$file", filename));
    }
  }
  if (ginFile) {
    const filename = path.resolve(cwd(), ginFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFileSync(
      filename,
      ginServer({
        dir: path.dirname(ginFile),
        prefixURL: prefixURL,
      }),
    );
    if (ginFormat) {
      execCli(ginFormat.replace("$file", filename));
    }
  }
  if (actixWebFile) {
    //
  }
}
