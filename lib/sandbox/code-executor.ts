/**
 * Secure Code Execution Sandbox
 *
 * Features:
 * - Isolated code execution
 * - Resource limits and timeouts
 * - Safe API for interactive examples
 * - Multiple language support
 * - Error handling and validation
 */

import { NodeVM, VMScript } from 'vm2'

export interface ExecutionRequest {
  code: string
  language: 'javascript' | 'typescript' | 'python' | 'bash'
  inputs?: Record<string, any>
  timeout?: number
  memoryLimit?: number
  allowedModules?: string[]
}

export interface ExecutionResult {
  success: boolean
  output: string
  error?: string
  executionTime: number
  memoryUsed: number
  exitCode?: number
}

export interface SandboxConfig {
  timeout: number
  memoryLimit: number
  allowedModules: string[]
  allowedGlobals: string[]
  networkAccess: boolean
  fileSystemAccess: boolean
}

export class CodeExecutionSandbox {
  private defaultConfig: SandboxConfig = {
    timeout: 5000, // 5 seconds
    memoryLimit: 50 * 1024 * 1024, // 50MB
    allowedModules: ['util', 'path', 'url', 'querystring', 'crypto'],
    allowedGlobals: ['console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    networkAccess: false,
    fileSystemAccess: false
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      // Validate request
      const validation = this.validateRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          output: '',
          error: validation.error,
          executionTime: Date.now() - startTime,
          memoryUsed: 0
        }
      }

      // Execute based on language
      switch (request.language) {
        case 'javascript':
        case 'typescript':
          return await this.executeJavaScript(request, startTime)

        case 'python':
          return await this.executePython(request, startTime)

        case 'bash':
          return await this.executeBash(request, startTime)

        default:
          return {
            success: false,
            output: '',
            error: `Unsupported language: ${request.language}`,
            executionTime: Date.now() - startTime,
            memoryUsed: 0
          }
      }
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `Execution failed: ${error.message}`,
        executionTime: Date.now() - startTime,
        memoryUsed: 0
      }
    }
  }

  private validateRequest(request: ExecutionRequest): { valid: boolean; error?: string } {
    if (!request.code || request.code.trim().length === 0) {
      return { valid: false, error: 'Code cannot be empty' }
    }

    if (request.code.length > 10000) {
      return { valid: false, error: 'Code too long (max 10,000 characters)' }
    }

    const dangerousPatterns = [
      /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
      /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
      /require\s*\(\s*['"`]http['"`]\s*\)/gi,
      /require\s*\(\s*['"`]https['"`]\s*\)/gi,
      /process\.exit/gi,
      /global\./gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /new\s+Function/gi
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(request.code)) {
        return { valid: false, error: 'Code contains potentially dangerous operations' }
      }
    }

    return { valid: true }
  }

  private async executeJavaScript(request: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
    const config = {
      ...this.defaultConfig,
      timeout: request.timeout || this.defaultConfig.timeout,
      allowedModules: request.allowedModules || this.defaultConfig.allowedModules
    }

    // Prepare the code with inputs
    let code = request.code
    if (request.inputs) {
      const inputDeclarations = Object.entries(request.inputs)
        .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
        .join('\n')
      code = inputDeclarations + '\n\n' + code
    }

    // Capture console output
    let output = ''
    const mockConsole = {
      log: (...args: any[]) => {
        output += args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ') + '\n'
      },
      error: (...args: any[]) => {
        output += '[ERROR] ' + args.map(arg => String(arg)).join(' ') + '\n'
      },
      warn: (...args: any[]) => {
        output += '[WARN] ' + args.map(arg => String(arg)).join(' ') + '\n'
      },
      info: (...args: any[]) => {
        output += '[INFO] ' + args.map(arg => String(arg)).join(' ') + '\n'
      }
    }

    try {
      const vm = new NodeVM({
        console: 'redirect',
        sandbox: {
          console: mockConsole,
          ...request.inputs
        },
        require: {
          external: config.allowedModules,
          builtin: config.allowedModules
        },
        timeout: config.timeout,
        wasm: false // Disable WebAssembly for security
      })

      // Redirect console output
      vm.on('console.log', (...args) => mockConsole.log(...args))
      vm.on('console.error', (...args) => mockConsole.error(...args))
      vm.on('console.warn', (...args) => mockConsole.warn(...args))
      vm.on('console.info', (...args) => mockConsole.info(...args))

      const script = new VMScript(code)
      const result = vm.run(script)

      const executionTime = Date.now() - startTime

      // If the code returns a value, add it to output
      if (result !== undefined) {
        output += '\n[RETURN] ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
      }

      return {
        success: true,
        output: output.trim(),
        executionTime,
        memoryUsed: this.estimateMemoryUsage(code),
        exitCode: 0
      }
    } catch (error: any) {
      return {
        success: false,
        output: output.trim(),
        error: error.message,
        executionTime: Date.now() - startTime,
        memoryUsed: this.estimateMemoryUsage(code)
      }
    }
  }

  private async executePython(request: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
    // Note: Python execution would require a separate Python process or Pyodide
    // This is a placeholder for future implementation
    return {
      success: false,
      output: '',
      error: 'Python execution not yet implemented',
      executionTime: Date.now() - startTime,
      memoryUsed: 0
    }
  }

  private async executeBash(request: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
    // Note: Bash execution is highly dangerous and should be restricted to safe commands only
    // This is a placeholder with strict limitations
    return {
      success: false,
      output: '',
      error: 'Bash execution disabled for security',
      executionTime: Date.now() - startTime,
      memoryUsed: 0
    }
  }

  private estimateMemoryUsage(code: string): number {
    // Rough estimation based on code size and complexity
    const baseMemory = 1024 * 1024 // 1MB base
    const codeSizeFactor = code.length * 10 // ~10 bytes per character
    const complexityFactor = (code.split('\n').length) * 1024 // 1KB per line

    return baseMemory + codeSizeFactor + complexityFactor
  }

  async validateCodeForExecution(code: string, language: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Language-specific validation
    switch (language) {
      case 'javascript':
      case 'typescript':
        // Check for syntax errors
        try {
          new Function(code)
        } catch (syntaxError: any) {
          errors.push(`Syntax error: ${syntaxError.message}`)
        }

        // Check for dangerous patterns
        if (code.includes('while(true)') || code.includes('for(;;)')) {
          warnings.push('Infinite loop detected - execution may timeout')
        }

        if (code.includes('process.exit')) {
          errors.push('process.exit() is not allowed')
        }
        break

      case 'python':
        // Basic Python validation
        if (code.includes('import os') || code.includes('import subprocess')) {
          errors.push('Dangerous imports detected')
        }
        break

      case 'bash':
        // Bash validation
        if (code.includes('rm -rf') || code.includes('sudo')) {
          errors.push('Dangerous bash commands detected')
        }
        break
    }

    // General security checks
    if (code.includes('password') || code.includes('secret') || code.includes('token')) {
      warnings.push('Code appears to contain sensitive data')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  getSupportedLanguages(): string[] {
    return ['javascript', 'typescript', 'python', 'bash']
  }

  getResourceLimits(): {
    maxExecutionTime: number
    maxMemory: number
    maxOutputSize: number
  } {
    return {
      maxExecutionTime: this.defaultConfig.timeout,
      maxMemory: this.defaultConfig.memoryLimit,
      maxOutputSize: 1024 * 1024 // 1MB
    }
  }
}

// Interactive example runner for documentation
export class InteractiveExampleRunner {
  private sandbox: CodeExecutionSandbox

  constructor() {
    this.sandbox = new CodeExecutionSandbox()
  }

  async runExample(
    code: string,
    language: string,
    exampleInputs?: any[]
  ): Promise<{
    results: ExecutionResult[]
    summary: {
      successCount: number
      totalExamples: number
      averageExecutionTime: number
    }
  }> {
    const results: ExecutionResult[] = []

    if (exampleInputs && exampleInputs.length > 0) {
      // Run with multiple inputs
      for (const inputs of exampleInputs) {
        const result = await this.sandbox.executeCode({
          code,
          language: language as any,
          inputs,
          timeout: 3000 // Shorter timeout for examples
        })
        results.push(result)
      }
    } else {
      // Run once without inputs
      const result = await this.sandbox.executeCode({
        code,
        language: language as any,
        timeout: 3000
      })
      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length

    return {
      results,
      summary: {
        successCount,
        totalExamples: results.length,
        averageExecutionTime
      }
    }
  }

  async validateExampleCode(code: string, language: string): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const validation = await this.sandbox.validateCodeForExecution(code, language)

    return {
      valid: validation.valid,
      issues: [...validation.errors, ...validation.warnings]
    }
  }
}

// Singleton instances
let sandboxInstance: CodeExecutionSandbox | null = null
let exampleRunnerInstance: InteractiveExampleRunner | null = null

export function getCodeExecutionSandbox(): CodeExecutionSandbox {
  if (!sandboxInstance) {
    sandboxInstance = new CodeExecutionSandbox()
  }
  return sandboxInstance
}

export function getInteractiveExampleRunner(): InteractiveExampleRunner {
  if (!exampleRunnerInstance) {
    exampleRunnerInstance = new InteractiveExampleRunner()
  }
  return exampleRunnerInstance
}

// Convenience functions
export async function executeCodeInSandbox(request: ExecutionRequest) {
  const sandbox = getCodeExecutionSandbox()
  return sandbox.executeCode(request)
}

export async function runInteractiveExample(
  code: string,
  language: string,
  exampleInputs?: any[]
) {
  const runner = getInteractiveExampleRunner()
  return runner.runExample(code, language, exampleInputs)
}

export async function validateExampleCode(code: string, language: string) {
  const runner = getInteractiveExampleRunner()
  return runner.validateExampleCode(code, language)
}
