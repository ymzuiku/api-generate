import fs from "fs-extra";
import path from "path";
import { cwd } from "process";
import { generateClient } from "./generate-client";
import { generateServer } from "./generate-server";

export * from "./schema";

export function generate({
  clientFile,
  serverFile,
  trimUrlName,
  allSettled,
}: {
  clientFile?: string;
  serverFile?: string;
  trimUrlName?: string;
  allSettled?: boolean;
}) {
  if (clientFile) {
    const filename = path.resolve(cwd(), clientFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(filename, generateClient({ allSettled, trimUrlName }));
  }
  if (serverFile) {
    const filename = path.resolve(cwd(), serverFile);
    fs.ensureDirSync(path.dirname(filename));
    fs.writeFile(
      filename,
      generateServer({
        dir: path.dirname(serverFile),
        trimUrlName,
      }),
    );
  }
}
