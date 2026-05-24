export const sendSMS = async (phone: string, message: string) => {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, message })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error enviando mensaje por WhatsApp API:', error);
    return { success: false, error };
  }
};
