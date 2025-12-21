import { GitHubService } from './service'
import * as fs from 'fs/promises'
import * as path from 'path'
import { tmpdir } from 'os'

export interface RepoFile {
  path: string
  content: string
  language: string | null
}

export class RepoCloner {
  private github: GitHubService
  private tempDir: string | null = null

  constructor(github: GitHubService) {
    this.github = github
  }

  async cloneRepository(owner: string, repo: string, branch: string = 'main'): Promise<string> {
    const tempPath = path.join(tmpdir(), `repo-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    await fs.mkdir(tempPath, { recursive: true })
    this.tempDir = tempPath

    await this.downloadFiles(owner, repo, branch, '', tempPath)
    
    return tempPath
  }

  private async downloadFiles(
    owner: string,
    repo: string,
    branch: string,
    dirPath: string,
    localPath: string
  ): Promise<void> {
    const content = await this.github.getRepositoryContent(owner, repo, dirPath, branch)
    
    if (!content) {
      return
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        const itemPath = path.join(localPath, item.name)
        
        if (item.type === 'file') {
          const fileContent = await this.github.getFileContent(owner, repo, item.path, branch)
          if (fileContent) {
            await fs.writeFile(itemPath, fileContent, 'utf-8')
          }
        } else if (item.type === 'dir') {
          await fs.mkdir(itemPath, { recursive: true })
          await this.downloadFiles(owner, repo, branch, item.path, itemPath)
        }
      }
    } else if (content.type === 'file') {
      const fileContent = await this.github.getFileContent(owner, repo, dirPath, branch)
      if (fileContent) {
        await fs.writeFile(localPath, fileContent, 'utf-8')
      }
    }
  }

  async getFiles(repoPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): Promise<RepoFile[]> {
    const files: RepoFile[] = []
    
    async function walkDir(dir: string, basePath: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.relative(basePath, fullPath)
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walkDir(fullPath, basePath)
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (extensions.length === 0 || extensions.includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8')
              files.push({
                path: relativePath,
                content,
                language: ext.substring(1) || null,
              })
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }
    }
    
    await walkDir(repoPath, repoPath)
    return files
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true })
      } catch (error) {
        // Ignore cleanup errors
      }
      this.tempDir = null
    }
  }
}

