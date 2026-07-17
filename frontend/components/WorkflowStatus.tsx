'use client';
import { useEffect, useState } from 'react';
import { getWorkflow } from '@/lib/api';

export default function WorkflowStatus({ workflowId }: { workflowId: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const poll = setInterval(async () => {
      const data = await getWorkflow(workflowId);
      setStatus(data.status);
      if (data.status === 'completed' || data.status === 'failed') clearInterval(poll);
    }, 2000);
    return () => clearInterval(poll);
  }, [workflowId]);

  return <div className="badge">Trạng thái: {status}</div>;
}
