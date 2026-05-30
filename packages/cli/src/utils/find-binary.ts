/**
 * Minimal cross-platform PATH walker for binary discovery.
 *
 * Used by `ccwf run --launch` to locate the `claude` CLI without dragging in
 * `which` or `npm-which` as a dependency. Returns the first executable match
 * or `null` — callers decide whether to error or fall back.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function isExecutable(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return false;
    if (process.platform === 'win32') {
      // Win32 marks executables by extension, not by mode bits.
      const ext = path.extname(target).toLowerCase();
      const pathext = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').toLowerCase().split(';');
      return pathext.includes(ext);
    }
    // POSIX: any of the execute bits is enough.
    return (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

export async function findBinaryInPath(binary: string): Promise<string | null> {
  const pathEnv = process.env.PATH ?? '';
  const sep = process.platform === 'win32' ? ';' : ':';
  const dirs = pathEnv.split(sep).filter(Boolean);

  // On Win32 we also try every PATHEXT suffix when the caller didn't supply one.
  const candidatesForDir = (dir: string): string[] => {
    if (process.platform !== 'win32') {
      return [path.join(dir, binary)];
    }
    if (path.extname(binary)) {
      return [path.join(dir, binary)];
    }
    const exts = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';');
    return exts.map((ext) => path.join(dir, binary + ext));
  };

  for (const dir of dirs) {
    for (const candidate of candidatesForDir(dir)) {
      if (await isExecutable(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}
