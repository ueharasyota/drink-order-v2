export async function fetchSalesReport(date: string) {
  try {
    const res = await fetch(`/api/sales-report?date=${date}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    return data;  // APIからの売上報告の配列が返ってきます
  } catch (error) {
    console.error("売上報告データ取得エラー:", error);
    return null;
  }
}
