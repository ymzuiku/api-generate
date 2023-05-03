import { spawn } from "child_process";

export function urlToName(url: string) {
  const parts = url.split("/");
  const nameParts = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.length > 0) {
      const namePart = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      nameParts.push(namePart);
    }
  }

  return nameParts.join("");
}

export function upperFirst(url: string) {
  return url[0].toUpperCase() + url.slice(1);
}

export function lowerFirst(url: string) {
  return url[0].toLowerCase() + url.slice(1);
}

export const header = "/* Don't Edit, this file is create by api-generate */";

export function execCli(str: string) {
  const [start, ...args] = str.split(" ");
  const ls = spawn(start, args);

  ls.stdout.on("data", (data) => {
    console.log(`${data}`);
  });

  ls.stderr.on("data", (data) => {
    console.error(`${data}`);
  });

  ls.on("close", (code) => {
    console.log(`close: ${code}`);
  });
}
