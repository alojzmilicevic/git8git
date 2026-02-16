import { DEFAULT_N8N_URL } from "./config"

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: unknown[]
  connections: unknown
  settings?: unknown
  staticData?: unknown
  tags?: { id: string; name: string }[]
  createdAt: string
  updatedAt: string
}

export interface N8nConfig {
  apiKey: string | null
  baseUrl: string
}

async function getN8nConfig(): Promise<N8nConfig> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return { apiKey: null, baseUrl: DEFAULT_N8N_URL }
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.get(['n8nApiKey', 'n8nBaseUrl'], (result) => {
      resolve({
        apiKey: (result.n8nApiKey as string) || null,
        baseUrl: (result.n8nBaseUrl as string) || DEFAULT_N8N_URL
      })
    })
  })
}

export async function getN8nBaseUrl(): Promise<string> {
  const config = await getN8nConfig()
  return config.baseUrl
}

export async function getWorkflow(workflowId: string): Promise<N8nWorkflow> {
  const config = await getN8nConfig()
  if (!config.apiKey) {
    throw new Error('n8n API key not configured')
  }

  const response = await fetch(`${config.baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': config.apiKey,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.status}`)
  }

  return response.json()
}

export async function updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
  const config = await getN8nConfig()
  if (!config.apiKey) {
    throw new Error('n8n API key not configured')
  }

  const response = await fetch(`${config.baseUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': config.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflow)
  })

  if (!response.ok) {
    throw new Error(`Failed to update workflow: ${response.status}`)
  }

  return response.json()
}

export function getWorkflowIdFromUrl(): string | null {
  const match = window.location.pathname.match(/\/workflow\/([^/]+)/)
  return match ? match[1] : null
}

export function sanitizeFilename(name: string): string {
  return name.replace(/\//g, '-').trim()
}
