import { toast } from 'sonner';

export function showSuccess(message: string) {
  toast.success(message, {
    style: {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#15803d',
    },
  });
}

export function showError(message: string) {
  toast.error(message, {
    style: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#b91c1c',
    },
  });
}
