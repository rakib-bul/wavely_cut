
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  
  // If it's a simple YYYY-MM-DD string
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  // Handle ISO strings or other date formats
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch (e) {
    // Fallback to original string
  }

  return dateString;
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${d}/${m}/${y} ${hours}:${minutes}:${seconds}`;
    }
  } catch (e) {}
  return dateString;
};
