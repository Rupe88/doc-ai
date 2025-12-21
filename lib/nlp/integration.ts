/**
 * NLP Integration Module
 * Integrates NLP features into existing systems
 */

import { CodeSummarizer } from './code-summarization'
import { CodeToNaturalLanguage } from './code-to-nl'
import { CodeEntityRecognizer } from './entity-recognition'
import { CodeTopicModeler } from './topic-modeling'
import { CodeSentimentAnalyzer } from './sentiment-analysis'
import { SemanticCodeSearch } from './semantic-search'
import type { AnalysisResult, FunctionInfo, ClassInfo } from '@/types/analyzer'

export class NLPIntegration {
  private summarizer: CodeSummarizer
  private codeToNL: CodeToNaturalLanguage
  private entityRecognizer: CodeEntityRecognizer
  private topicModeler: CodeTopicModeler
  private sentimentAnalyzer: CodeSentimentAnalyzer
  private semanticSearch: SemanticCodeSearch

  constructor() {
    this.summarizer = new CodeSummarizer()
    this.codeToNL = new CodeToNaturalLanguage()
    this.entityRecognizer = new CodeEntityRecognizer()
    this.topicModeler = new CodeTopicModeler()
    this.sentimentAnalyzer = new CodeSentimentAnalyzer()
    this.semanticSearch = new SemanticCodeSearch()
  }

  /**
   * Enhance analysis result with NLP insights
   */
  async enhanceAnalysis(analysisResult: AnalysisResult): Promise<AnalysisResult & {
    summaries: Map<string, string>
    explanations: Map<string, string>
    topics: any[]
    qualityReport: any
  }> {
    const summaries = new Map<string, string>()
    const explanations = new Map<string, string>()

    // Generate summaries for functions
    for (const func of analysisResult.structure.functions.slice(0, 50)) {
      if (func.code) {
        try {
          const summary = await this.summarizer.summarizeFunction(func, func.code)
          summaries.set(func.name, summary.summary)
        } catch (error) {
          console.error(`Failed to summarize ${func.name}:`, error)
        }
      }
    }

    // Generate explanations for functions
    for (const func of analysisResult.structure.functions.slice(0, 50)) {
      if (func.code) {
        try {
          const explanation = await this.codeToNL.explainFunction(func, func.code)
          explanations.set(func.name, explanation)
        } catch (error) {
          console.error(`Failed to explain ${func.name}:`, error)
        }
      }
    }

    // Extract topics
    const files = analysisResult.structure.functions.map(f => ({
      path: '',
      functions: [f],
      classes: [],
    }))
    const topics = await this.topicModeler.extractTopics(files)

    // Generate quality report
    const qualityReport = await this.sentimentAnalyzer.generateQualityReport(
      analysisResult.structure.functions,
      analysisResult.structure.classes
    )

    return {
      ...analysisResult,
      summaries,
      explanations,
      topics,
      qualityReport,
    }
  }

  /**
   * Generate comprehensive NLP-enhanced documentation
   */
  async generateNLPEnhancedDoc(
    functionInfo: FunctionInfo,
    code: string,
    repoId: string
  ): Promise<{
    summary: string
    explanation: string
    complexity: any
    quality: any
    issues: any[]
    walkthrough: any
  }> {
    const [summary, explanation, complexity, quality, issues, walkthrough] = await Promise.all([
      this.summarizer.summarizeFunction(functionInfo, code).catch(() => ({ summary: '' })),
      this.codeToNL.explainFunction(functionInfo, code).catch(() => ''),
      this.sentimentAnalyzer.analyzeComplexity(code, functionInfo).catch(() => null),
      this.sentimentAnalyzer.assessQuality(code, functionInfo).catch(() => null),
      this.sentimentAnalyzer.detectIssues(code, functionInfo).catch(() => []),
      this.codeToNL.generateWalkthrough(code, functionInfo.name).catch(() => null),
    ])

    return {
      summary: (summary as any).summary || '',
      explanation: explanation || '',
      complexity: complexity || null,
      quality: quality || null,
      issues: issues || [],
      walkthrough: walkthrough || null,
    }
  }

  /**
   * Extract entities and build knowledge graph
   */
  async buildKnowledgeGraph(
    functions: FunctionInfo[],
    classes: ClassInfo[],
    filePath: string
  ): Promise<{
    entities: any[]
    graph: { nodes: any[]; edges: any[] }
    topics: any[]
  }> {
    const entities = await this.entityRecognizer.extractEntities(functions, classes, filePath)
    const graph = this.entityRecognizer.buildKnowledgeGraph(entities)
    
    const files = [{
      path: filePath,
      functions,
      classes,
    }]
    const topics = await this.topicModeler.extractTopics(files)

    return {
      entities,
      graph,
      topics,
    }
  }
}

