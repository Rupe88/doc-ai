declare module 'madge' {
  interface MadgeOptions {
    fileExtensions?: string[]
    excludeRegExp?: RegExp[]
  }

  interface MadgeResult {
    obj(): Record<string, string[]>
    image(output: string): Promise<string>
  }

  function madge(path: string, options?: MadgeOptions): Promise<MadgeResult>
  export = madge
}

