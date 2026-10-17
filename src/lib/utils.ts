export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Không hợp lệ';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Không hợp lệ';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
