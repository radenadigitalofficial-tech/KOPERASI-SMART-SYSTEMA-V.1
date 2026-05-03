/**
 * Service to interact with the Google Sheets via Google Apps Script (GAS).
 */

const GAS_URL = (import.meta as any).env.VITE_GAS_URL || '';

export async function sendToGAS(data: any) {
  if (!GAS_URL) {
    console.warn("GAS_URL is not configured. Google Sheets sync will not work.");
    return { status: 'error', message: 'GAS_URL not configured' };
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      mode: 'no-cors' // GAS Web Apps often require no-cors or specialized handling
    });
    return { status: 'success', data: response };
  } catch (error) {
    console.error("GAS Error:", error);
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}

export async function generateSmartReportViaGAS() {
  const data = { action: 'generate_laporan' };
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error("GAS Report Error:", error);
    throw error;
  }
}
