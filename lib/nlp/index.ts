/**
 * NLP Module - Comprehensive Natural Language Processing for Code
 * 
 * This module provides advanced NLP capabilities for code understanding,
 * documentation generation, and intelligent code analysis.
 */

export { SemanticCodeSearch } from './semantic-search'
export { CodeSummarizer } from './code-summarization'
export { CodeToNaturalLanguage } from './code-to-nl'
export { CodeEntityRecognizer } from './entity-recognition'
export { CodeTopicModeler } from './topic-modeling'
export { CodeSentimentAnalyzer } from './sentiment-analysis'

export type {
  SemanticSearchResult,
  CodeIntent,
} from './semantic-search'

export type {
  CodeSummary,
} from './code-summarization'

export type {
  CodeExplanation,
  PlainEnglishExplanation,
} from './code-to-nl'

export type {
  CodeEntity,
  EntityRelationship,
  EntityClassification,
} from './entity-recognition'

export type {
  CodeTopic,
  Theme,
  TopicGroup,
} from './topic-modeling'

export type {
  ComplexityScore,
  QualityScore,
  CodeIssue,
} from './sentiment-analysis'

