const N8N_BASE_URL = 'http://localhost:5678'

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

async function getApiKey(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.get('n8nApiKey', (result) => {
      resolve((result.n8nApiKey as string) || null)
    })
  })
}

export async function getWorkflow(workflowId: string): Promise<N8nWorkflow> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    throw new Error('n8n API key not configured')
  }

  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.status}`)
  }

  return response.json()
}

export async function updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    throw new Error('n8n API key not configured')
  }

  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
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
  // URL format: http://localhost:5678/workflow/abc123
  const match = window.location.pathname.match(/\/workflow\/([^/]+)/)
  return match ? match[1] : null
}

export function sanitizeFilename(name: string): string {
  return name.replace(/\//g, '-').trim()
}
