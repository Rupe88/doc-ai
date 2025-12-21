import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export interface Job {
  id: string
  type: 'analysis' | 'doc_generation' | 'sync'
  data: any
  priority: number
  attempts: number
  maxAttempts: number
}

export class JobProcessor {
  private queueName = 'docai:jobs'
  private processingQueue = 'docai:processing'
  private deadLetterQueue = 'docai:dead_letters'

  async enqueue(job: Omit<Job, 'id' | 'attempts'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const fullJob: Job = {
      ...job,
      id: jobId,
      attempts: 0,
    }

    if (!redis) {
      console.warn('Redis not configured, job queued in memory only')
      return jobId
    }

    await redis.zadd(this.queueName, {
      score: Date.now() + (fullJob.priority * 1000),
      member: JSON.stringify(fullJob),
    })

    return jobId
  }

  async dequeue(): Promise<Job | null> {
    if (!redis) return null
    
    const jobs = await redis.zrange<string[]>(this.queueName, 0, 0, { rev: true })
    
    if (jobs.length === 0) {
      return null
    }

    const job = JSON.parse(jobs[0]) as Job
    await redis.zrem(this.queueName, jobs[0])
    await redis.zadd(this.processingQueue, {
      score: Date.now(),
      member: JSON.stringify(job),
    })

    return job
  }

  async complete(jobId: string): Promise<void> {
    await this.removeFromProcessing(jobId)
  }

  async fail(job: Job, error: string): Promise<void> {
    if (!redis) return
    
    await this.removeFromProcessing(job.id)

    if (job.attempts >= job.maxAttempts) {
      await redis.zadd(this.deadLetterQueue, {
        score: Date.now(),
        member: JSON.stringify({ ...job, error }),
      })
    } else {
      const retryJob: Job = {
        ...job,
        attempts: job.attempts + 1,
      }

      const backoffDelay = Math.pow(2, retryJob.attempts) * 1000
      await redis.zadd(this.queueName, {
        score: Date.now() + backoffDelay,
        member: JSON.stringify(retryJob),
      })
    }
  }

  private async removeFromProcessing(jobId: string): Promise<void> {
    if (!redis) return
    
    const jobs = await redis.zrange<string[]>(this.processingQueue, 0, -1)
    for (const jobStr of jobs) {
      const job = JSON.parse(jobStr) as Job
      if (job.id === jobId) {
        await redis.zrem(this.processingQueue, jobStr)
        break
      }
    }
  }

  async getJobStatus(jobId: string): Promise<'pending' | 'processing' | 'completed' | 'failed' | null> {
    if (!redis) return null
    
    const queues = [this.queueName, this.processingQueue, this.deadLetterQueue]
    
    for (const queue of queues) {
      const jobs = await redis.zrange<string[]>(queue, 0, -1)
      for (const jobStr of jobs) {
        const job = JSON.parse(jobStr) as Job
        if (job.id === jobId) {
          if (queue === this.queueName) return 'pending'
          if (queue === this.processingQueue) return 'processing'
          if (queue === this.deadLetterQueue) return 'failed'
        }
      }
    }

    return 'completed'
  }
}

