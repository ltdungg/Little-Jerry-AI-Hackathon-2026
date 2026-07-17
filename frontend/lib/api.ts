const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function sendMessage(message: string, projectId?: string) {
  const res = await fetch(`${API_URL}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, project_id: projectId, mode: 'sync' }),
  });
  return res.json();
}

export async function getWorkflow(workflowId: string) {
  const res = await fetch(`${API_URL}/v1/workflows/${workflowId}`);
  return res.json();
}

export async function confirmWorkflow(workflowId: string, confirmationToken: string) {
  const res = await fetch(`${API_URL}/v1/workflows/${workflowId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation_token: confirmationToken }),
  });
  return res.json();
}
