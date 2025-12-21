'use client'

import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'

interface DocViewerProps {
  content: string
  title?: string
}

export function DocViewer({ content, title }: DocViewerProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-8">
        {title && <h1 className="text-3xl font-bold mb-6 text-card-foreground">{title}</h1>}
        <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-card-foreground prose-p:text-card-foreground prose-strong:text-card-foreground prose-code:text-card-foreground">
          <ReactMarkdown
            components={{
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <pre className="bg-card border border-border p-4 rounded-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-card border border-border px-1 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

