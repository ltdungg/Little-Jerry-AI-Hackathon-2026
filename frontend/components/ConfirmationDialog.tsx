'use client';
import { confirmWorkflow } from '@/lib/api';

export default function ConfirmationDialog({ workflowId, token, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg">
        <p>Bạn có muốn thực hiện hành động này?</p>
        <div className="flex gap-4 mt-4">
          <button onClick={() => confirmWorkflow(workflowId, token).then(onConfirm)} className="bg-green-600 text-white px-4 py-2 rounded">Xác nhận</button>
          <button onClick={onConfirm} className="bg-gray-400 text-white px-4 py-2 rounded">Hủy</button>
        </div>
      </div>
    </div>
  );
}
