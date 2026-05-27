// NOTA DE SEGURIDAD: La clave API de Gemini se mantiene SOLO en el servidor (.env).
// El cliente nunca accede directamente a la API — todas las consultas se enrutan
// de forma segura a través del backend Express (ver server.ts).

export async function askMedicalAssistant(
  query: string,
  patientName: string,
  chatHistory: { role: 'user' | 'assistant'; text: string }[] = []
) {
  const response = await fetch('/api/medical-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, patientName, history: chatHistory })
  });

  if (!response.ok) {
    let errorMessage = 'Error al consultar al asistente médico.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Response wasn't JSON
    }

    if (response.status === 429) {
      throw new Error('⏳ Cuota de IA excedida temporalmente. Intenta de nuevo en unos segundos.');
    }
    if (response.status === 503 || response.status === 502) {
      throw new Error('🔌 El servicio de IA no está disponible en este momento. Intenta más tarde.');
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.text || 'No se pudo generar una respuesta.';
}
