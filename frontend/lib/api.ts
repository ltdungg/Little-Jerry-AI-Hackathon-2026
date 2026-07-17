import { getIdToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Builds request headers, attaching the Cognito ID token as a Bearer token so
// the API Gateway JWT authorizer accepts /v1/* requests.
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getIdToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function sendMessage(message: string, projectId?: string) {
  const res = await fetch(`${API_URL}/v1/chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ message, project_id: projectId, mode: 'sync' }),
  });
  return res.json();
}

export async function getWorkflow(workflowId: string) {
  const res = await fetch(`${API_URL}/v1/workflows/${workflowId}`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function confirmWorkflow(workflowId: string, confirmationToken: string) {
  const res = await fetch(`${API_URL}/v1/workflows/${workflowId}/confirm`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ confirmation_token: confirmationToken }),
  });
  return res.json();
}
