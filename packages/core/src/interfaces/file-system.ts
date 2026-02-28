export interface IFileSystem {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  createDirectory(dirPath: string): Promise<void>;
  readDirectory(
    dirPath: string
  ): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>>;
  stat(filePath: string): Promise<{ isFile: boolean; isDirectory: boolean }>;
}
