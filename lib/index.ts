import fs from "fs-extra";
import path from "path";
import { cwd } from "process";
import { generateClient } from "./generate-client";
import { generateServer } from "./generate-server-go";

export * from "./schema";

export function generate({
  clientFile,
  goFile,
  rustFile,
  prefixURL,
  allSettled,
}: {
  clientFile?: string;
  goFile?: string;
  rustFile?: string;
  prefixURL?: string;
  allSettled?: boolean;
}) {
  if (clientFile) {
    const filename = path.resolve(cwd(), clientFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(filename, generateClient({ allSettled, prefixURL: prefixURL }));
  }
  if (goFile) {
    const filename = path.resolve(cwd(), goFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(
      filename,
      generateServer({
        dir: path.dirname(goFile),
        prefixURL: prefixURL,
      }),
    );
  }
  if (rustFile) {
    const filename = path.resolve(cwd(), rustFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(
      filename,
      generateServer({
        dir: path.dirname(rustFile),
        prefixURL: prefixURL,
      }),
    );
  }
}
