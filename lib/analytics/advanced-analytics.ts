/**
 * Advanced Code Analytics Engine
 *
 * Features:
 * - Code churn analysis and trends
 * - Contributor impact metrics
 * - Dependency drift detection
 * - Code velocity and productivity metrics
 * - Technical debt evolution
 * - Risk assessment and predictions
 */

import { getRAGEngine } from '../ai/rag/engine'

export interface CodeChurnMetrics {
  totalCommits: number
  totalLinesChanged: number
  averageCommitSize: number
  churnRate: number // lines changed per day
  churnVelocity: number // acceleration of changes
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  hotspots: Array<{
    file: string
    churnCount: number
    lastModified: Date
    riskScore: number
  }>
}

export interface ContributorMetrics {
  totalContributors: number
  activeContributors: number
  contributorDistribution: Array<{
    author: string
    commits: number
    linesChanged: number
    filesModified: number
    expertise: string[]
    impact: number
    consistency: number
  }>
  busFactor: number // how many contributors to lose 50% of knowledge
  knowledgeDistribution: Record<string, number>
  newcomerRate: number
  churnRate: number
}

export interface DependencyDriftMetrics {
  totalDependencies: number
  outdatedDependencies: number
  securityVulnerabilities: number
  driftScore: number
  driftVelocity: number // how fast dependencies are becoming outdated
  recommendations: Array<{
    package: string
    currentVersion: string
    latestVersion: string
    severity: 'low' | 'medium' | 'high'
    reason: string
    impact: string
  }>
  breakingChanges: Array<{
    package: string
    breakingVersion: string
    impact: string
  }>
}

export interface CodeVelocityMetrics {
  commitsPerDay: number
  linesPerDay: number
  filesPerDay: number
  velocityTrend: 'accelerating' | 'stable' | 'decelerating'
  productivityScore: number
  qualityVelocity: number // quality improvement rate
  technicalDebtVelocity: number // debt accumulation rate
}

export class AdvancedAnalyticsEngine {
  private ragEngine = getRAGEngine()

  async analyzeCodeChurn(
    repoId: string,
    commits: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<CodeChurnMetrics> {
    const filteredCommits = commits.filter(commit =>
      commit.date >= timeRange.start && commit.date <= timeRange.end
    )

    const totalCommits = filteredCommits.length
    const totalLinesChanged = filteredCommits.reduce((sum, commit) =>
      sum + (commit.additions + commit.deletions), 0
    )

    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
    const churnRate = totalLinesChanged / Math.max(daysDiff, 1)

    // Calculate churn velocity (trend)
    const midPoint = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const firstHalf = filteredCommits.filter(c => c.date < midPoint)
    const secondHalf = filteredCommits.filter(c => c.date >= midPoint)

    const firstHalfChurn = firstHalf.reduce((sum, c) => sum + (c.additions + c.deletions), 0)
    const secondHalfChurn = secondHalf.reduce((sum, c) => sum + (c.additions + c.deletions), 0)

    const churnVelocity = secondHalfChurn > firstHalfChurn ? 1.2 :
                         secondHalfChurn < firstHalfChurn ? 0.8 : 1.0

    // Identify churn hotspots
    const fileChanges = new Map<string, { changes: number; lastModified: Date }>()

    for (const commit of filteredCommits) {
      for (const file of commit.files || []) {
        const existing = fileChanges.get(file.filename) || { changes: 0, lastModified: new Date(0) }
        fileChanges.set(file.filename, {
          changes: existing.changes + (file.additions + file.deletions),
          lastModified: new Date(Math.max(existing.lastModified.getTime(), commit.date.getTime()))
        })
      }
    }

    const hotspots = Array.from(fileChanges.entries())
      .map(([file, data]) => ({
        file,
        churnCount: data.changes,
        lastModified: data.lastModified,
        riskScore: this.calculateChurnRisk(data.changes, daysDiff, data.lastModified)
      }))
      .sort((a, b) => b.churnCount - a.churnCount)
      .slice(0, 10)

    const riskLevel = this.assessChurnRiskLevel(hotspots, churnRate, churnVelocity)

    return {
      totalCommits,
      totalLinesChanged,
      averageCommitSize: totalLinesChanged / Math.max(totalCommits, 1),
      churnRate,
      churnVelocity,
      riskLevel,
      hotspots
    }
  }

  async analyzeContributors(
    repoId: string,
    commits: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<ContributorMetrics> {
    const filteredCommits = commits.filter(commit =>
      commit.date >= timeRange.start && commit.date <= timeRange.end
    )

    const contributorStats = new Map<string, {
      commits: number
      linesChanged: number
      files: Set<string>
      firstCommit: Date
      lastCommit: Date
    }>()

    for (const commit of filteredCommits) {
      const author = commit.author
      const existing = contributorStats.get(author) || {
        commits: 0,
        linesChanged: 0,
        files: new Set(),
        firstCommit: commit.date,
        lastCommit: commit.date
      }

      existing.commits++
      existing.linesChanged += (commit.additions + commit.deletions)
      commit.files?.forEach((file: any) => existing.files.add(file.filename))
      existing.firstCommit = new Date(Math.min(existing.firstCommit.getTime(), commit.date.getTime()))
      existing.lastCommit = new Date(Math.max(existing.lastCommit.getTime(), commit.date.getTime()))

      contributorStats.set(author, existing)
    }

    const contributorArray = Array.from(contributorStats.entries())
      .map(([author, stats]) => ({
        author,
        commits: stats.commits,
        linesChanged: stats.linesChanged,
        filesModified: stats.files.size,
        firstCommit: stats.firstCommit,
        lastCommit: stats.lastCommit,
        expertise: [], // Would need file analysis to determine
        impact: this.calculateContributorImpact(stats, filteredCommits.length),
        consistency: this.calculateConsistency(stats.firstCommit, stats.lastCommit, stats.commits)
      }))
      .sort((a, b) => b.linesChanged - a.linesChanged)

    const totalContributors = contributorArray.length
    const activeContributors = contributorArray.filter(c => c.consistency > 0.5).length

    // Calculate bus factor
    const topContributors = contributorArray.slice(0, Math.ceil(totalContributors * 0.5))
    const busFactor = topContributors.length

    // Calculate knowledge distribution
    const knowledgeDistribution: Record<string, number> = {}
    contributorArray.forEach(contributor => {
      // Simple categorization based on file types
      knowledgeDistribution[contributor.author] = contributor.impact
    })

    // Calculate newcomer and churn rates
    const newContributors = contributorArray.filter(c => {
      const daysSinceFirst = (timeRange.end.getTime() - c.firstCommit.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceFirst < 30 // New in last 30 days
    }).length

    const newcomerRate = totalContributors > 0 ? newContributors / totalContributors : 0
    const churnRate = contributorArray.filter(c => {
      const daysSinceLast = (timeRange.end.getTime() - c.lastCommit.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLast > 90 // Inactive for 90+ days
    }).length / Math.max(totalContributors, 1)

    return {
      totalContributors,
      activeContributors,
      contributorDistribution: contributorArray,
      busFactor,
      knowledgeDistribution,
      newcomerRate,
      churnRate
    }
  }

  async analyzeDependencyDrift(
    repoId: string,
    packageJson: any,
    timeRange: { start: Date; end: Date }
  ): Promise<DependencyDriftMetrics> {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const depNames = Object.keys(allDeps)

    // This would typically integrate with npm registry API
    // For now, simulate analysis
    const outdatedDeps = depNames.filter(() => Math.random() > 0.7) // Simulate 30% outdated
    const securityVulns = depNames.filter(() => Math.random() > 0.9) // Simulate 10% vulnerable

    const driftScore = (outdatedDeps.length + securityVulns.length) / depNames.length

    // Generate recommendations
    const recommendations: any[] = outdatedDeps.slice(0, 5).map(dep => ({
      package: dep,
      currentVersion: allDeps[dep],
      latestVersion: `${allDeps[dep].split('.')[0]}.${parseInt(allDeps[dep].split('.')[1]) + 1}.0`,
      severity: (Math.random() > 0.7 ? 'high' : 'medium') as 'high' | 'medium',
      reason: 'Security patches and performance improvements',
      impact: 'Improved security and stability'
    }))

    const breakingChanges = recommendations.filter(r => r.severity === 'high').map(r => ({
      package: r.package,
      breakingVersion: r.latestVersion,
      impact: 'May require code changes due to API modifications'
    }))

    return {
      totalDependencies: depNames.length,
      outdatedDependencies: outdatedDeps.length,
      securityVulnerabilities: securityVulns.length,
      driftScore,
      driftVelocity: driftScore * 1.1, // Simulate increasing drift
      recommendations,
      breakingChanges
    }
  }

  async analyzeCodeVelocity(
    repoId: string,
    commits: any[],
    qualityMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<CodeVelocityMetrics> {
    const filteredCommits = commits.filter(commit =>
      commit.date >= timeRange.start && commit.date <= timeRange.end
    )

    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)

    const commitsPerDay = filteredCommits.length / Math.max(daysDiff, 1)
    const totalLinesChanged = filteredCommits.reduce((sum, c) => sum + (c.additions + c.deletions), 0)
    const linesPerDay = totalLinesChanged / Math.max(daysDiff, 1)

    const totalFilesChanged = new Set(
      filteredCommits.flatMap(c => c.files?.map((f: any) => f.filename) || [])
    ).size
    const filesPerDay = totalFilesChanged / Math.max(daysDiff, 1)

    // Calculate velocity trend
    const midPoint = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2)
    const firstHalf = filteredCommits.filter(c => c.date < midPoint)
    const secondHalf = filteredCommits.filter(c => c.date >= midPoint)

    const firstHalfVelocity = firstHalf.length / Math.max(daysDiff / 2, 1)
    const secondHalfVelocity = secondHalf.length / Math.max(daysDiff / 2, 1)

    const velocityTrend = secondHalfVelocity > firstHalfVelocity * 1.1 ? 'accelerating' :
                         secondHalfVelocity < firstHalfVelocity * 0.9 ? 'decelerating' : 'stable'

    // Calculate productivity and quality metrics
    const productivityScore = (commitsPerDay * 0.4) + (linesPerDay * 0.3) + (filesPerDay * 0.3)

    const qualityTrend = qualityMetrics.length > 1 ?
      qualityMetrics[qualityMetrics.length - 1].score - qualityMetrics[0].score : 0

    const qualityVelocity = qualityTrend / Math.max(daysDiff, 1)

    // Technical debt velocity (simplified)
    const technicalDebtVelocity = -qualityVelocity * 0.5 // Inverse relationship

    return {
      commitsPerDay,
      linesPerDay,
      filesPerDay,
      velocityTrend,
      productivityScore,
      qualityVelocity,
      technicalDebtVelocity
    }
  }

  private calculateChurnRisk(changes: number, daysDiff: number, lastModified: Date): number {
    const recencyFactor = Math.max(0, 1 - ((Date.now() - lastModified.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    const frequencyFactor = changes / Math.max(daysDiff, 1)
    return (frequencyFactor * 0.7) + (recencyFactor * 0.3)
  }

  private assessChurnRiskLevel(
    hotspots: any[],
    churnRate: number,
    churnVelocity: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskHotspots = hotspots.filter(h => h.riskScore > 0.7).length
    const riskScore = (churnRate / 100) + (highRiskHotspots / hotspots.length) + (churnVelocity - 1)

    if (riskScore > 2.5) return 'critical'
    if (riskScore > 1.8) return 'high'
    if (riskScore > 1.2) return 'medium'
    return 'low'
  }

  private calculateContributorImpact(stats: any, totalCommits: number): number {
    const commitRatio = stats.commits / totalCommits
    const lineRatio = stats.linesChanged / Math.max(totalCommits * 100, 1) // Assume avg 100 lines/commit
    return (commitRatio * 0.6) + (lineRatio * 0.4)
  }

  private calculateConsistency(firstCommit: Date, lastCommit: Date, commits: number): number {
    const activeDays = (lastCommit.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24)
    const expectedCommits = Math.max(activeDays / 7, 1) // Expect weekly commits
    return Math.min(commits / expectedCommits, 1)
  }
}

// Singleton analytics engine
let analyticsEngine: AdvancedAnalyticsEngine | null = null

export function getAdvancedAnalyticsEngine(): AdvancedAnalyticsEngine {
  if (!analyticsEngine) {
    analyticsEngine = new AdvancedAnalyticsEngine()
  }
  return analyticsEngine
}

// Convenience functions
export async function analyzeCodeChurn(repoId: string, commits: any[], timeRange: { start: Date; end: Date }) {
  const engine = getAdvancedAnalyticsEngine()
  return engine.analyzeCodeChurn(repoId, commits, timeRange)
}

export async function analyzeContributors(repoId: string, commits: any[], timeRange: { start: Date; end: Date }) {
  const engine = getAdvancedAnalyticsEngine()
  return engine.analyzeContributors(repoId, commits, timeRange)
}

export async function analyzeDependencyDrift(repoId: string, packageJson: any, timeRange: { start: Date; end: Date }) {
  const engine = getAdvancedAnalyticsEngine()
  return engine.analyzeDependencyDrift(repoId, packageJson, timeRange)
}

export async function analyzeCodeVelocity(repoId: string, commits: any[], qualityMetrics: any[], timeRange: { start: Date; end: Date }) {
  const engine = getAdvancedAnalyticsEngine()
  return engine.analyzeCodeVelocity(repoId, commits, qualityMetrics, timeRange)
}
