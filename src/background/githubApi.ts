import type { GitHubRepo } from '../shared/messages'
import { getStoredToken } from './githubAuth'

export async function listRepos(): Promise<GitHubRepo[]> {
  const token = await getStoredToken()
  if (!token) throw new Error('Not authenticated.')

  // Minimal: fetch first page of repos. (Pagination can be added later.)
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub API error (${res.status}): ${text}`)
  }

  const data = (await res.json()) as Array<{
    id: number
    full_name: string
    private: boolean
    html_url: string
  }>

  return data.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    private: r.private,
    html_url: r.html_url
  }))
}

