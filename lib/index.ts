import fs from "fs-extra";
import path from "path";
import { cwd } from "process";
import { actixWebServer } from "./generate-actix-web";
import { generateClient } from "./generate-client";
import { ginServer } from "./generate-gin";

export * from "./schema";

export function generate({
  clientFile,
  ginFile,
  actixWebFile,
  prefixURL,
  allSettled,
}: {
  clientFile?: string;
  ginFile?: string;
  actixWebFile?: string;
  prefixURL?: string;
  allSettled?: boolean;
}) {
  if (clientFile) {
    const filename = path.resolve(cwd(), clientFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(filename, generateClient({ allSettled, prefixURL: prefixURL }));
  }
  if (ginFile) {
    const filename = path.resolve(cwd(), ginFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(
      filename,
      ginServer({
        dir: path.dirname(ginFile),
        prefixURL: prefixURL,
      }),
    );
  }
  if (actixWebFile) {
    const filename = path.resolve(cwd(), actixWebFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(
      filename,
      actixWebServer({
        dir: path.dirname(actixWebFile),
        prefixURL: prefixURL,
      }),
    );
  }
}
