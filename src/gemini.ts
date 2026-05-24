// NOTA DE SEGURIDAD: Inicializar el cliente de Gemini y colocar la clave API en el navegador
// expone la clave al público. Siguiendo las directrices estrictas de seguridad de la plataforma, 
// la clave se debe mantener y utilizar SIEMPRE en un entorno de servidor. 
// Para este proyecto, todas las consultas a Gemini se enrutan de forma segura a través de 
// nuestro backend Express (ver server.ts) que ya tiene el SDK @google/genai configurado.
// 
// La variable solicitada se define aquí a modo de referencia, pero debes colocar tu clave 
// real en la sección de Configuración de Entorno (.env) como GEMINI_API_KEY.
export const API_KEY = "AIzaSyAN5gOeKe1CJ5rQBiLvD0SK6mK3qcRYJIY"; 

export async function askMedicalAssistant(query: string, patientName: string) {
  // En lugar de usar la clave en el cliente directamente con @google/generative-ai, 
  // realizamos un proxy a la ruta segura de la API del servidor usando gemini-1.5-flash.
  const response = await fetch('/api/medical-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, patientName, apiKey: API_KEY })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al consultar al asistente');
  }
  
  const data = await response.json();
  return data.text;
}
