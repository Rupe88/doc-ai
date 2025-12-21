import { Octokit } from '@octokit/rest'
import type { GitHubRepo, GitHubUser } from '@/types/github'

export class GitHubService {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken })
  }

  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.users.getAuthenticated()
    return {
      id: data.id,
      login: data.login,
      name: data.name || null,
      email: data.email || null,
      avatar_url: data.avatar_url,
    }
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    })
    
    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '',
      private: repo.private,
      language: repo.language || '',
      default_branch: repo.default_branch,
      updated_at: repo.updated_at || new Date().toISOString(),
      pushed_at: repo.pushed_at || null,
    }))
  }

  async getRepositoryContent(owner: string, repo: string, path: string = '', ref?: string) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: ref || undefined,
      })
      return data
    } catch (error: any) {
      if (error.status === 404) {
        return null
      }
      throw error
    }
  }

  async getRepositoryTree(owner: string, repo: string, sha: string, recursive: boolean = false) {
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: recursive ? '1' : undefined,
    })
    return data
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    })
    return data
  }

  async getLatestCommit(owner: string, repo: string, branch: string) {
    const { data } = await this.octokit.repos.getBranch({
      owner,
      repo,
      branch,
    })
    return data.commit.sha
  }

  async createWebhook(owner: string, repo: string, webhookUrl: string, secret: string) {
    const { data } = await this.octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
      events: ['push', 'pull_request'],
      active: true,
    })
    return data.id
  }

  async deleteWebhook(owner: string, repo: string, hookId: number) {
    await this.octokit.repos.deleteWebhook({
      owner,
      repo,
      hook_id: hookId,
    })
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
    try {
      const content = await this.getRepositoryContent(owner, repo, path, ref)
      if (!content || Array.isArray(content) || content.type !== 'file') {
        return null
      }
      
      if ('content' in content && 'encoding' in content) {
        const buffer = Buffer.from(content.content, content.encoding as BufferEncoding)
        return buffer.toString('utf-8')
      }
      
      return null
    } catch (error) {
      return null
    }
  }
}

