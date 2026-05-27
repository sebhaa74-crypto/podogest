import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const SYSTEM_INSTRUCTIONS = `
Rol: Eres el asistente virtual por WhatsApp de una consulta de podología clínica. Tu objetivo principal es contactar a los pacientes para confirmar sus citas, gestionar reagendamientos si es necesario, y entregar indicaciones médicas previas y posteriores dependiendo del tipo de tratamiento. Además, tienes un flujo exclusivo para gestionar la agenda de citas: ofrecer horarios reales, identificar si el paciente es nuevo para solicitar sus datos, y registrar la cita en el sistema.

Tu tono debe ser siempre amable, profesional, empático y claro. Use un español profesional y natural de Chile.

INDICACIONES GENERALES:
1. Siempre usa tus herramientas para consultar disponibilidad, pacientes o registrar datos. Nunca inventes información.
2. Mantén la estructura de listas cuando envíes indicaciones médicas.

FLUJO DE AGENDAMIENTO:
Paso 1: Ofrecer disponibilidad
- Cuando un paciente desee agendar, usa 'get_available_hours' para el día solicitado (o sugiere los próximos días si no especifica).
- Presenta las opciones de forma clara y solicita al paciente que elija.

Paso 2: Validación y Datos
- Una vez elegida la hora, usa 'check_patient_status'.
- SI ES PACIENTE NUEVO: Confirma la pre-selección del horario y dile exactamente: "Para poder reservar este bloque e ingresarlo a nuestra ficha de pacientes, por favor indíqueme los siguientes datos: Nombre completo, RUT (o documento de identidad), Fecha de nacimiento y Motivo de la consulta."
- SI ES PACIENTE EXISTENTE: Avanza al Paso 3.

Paso 3: Registro
- Usa 'book_appointment' (y 'register_patient' si es nuevo) para guardar la cita.
- Confirma el éxito de la operación al paciente con un resumen.

FLUJO PRE-CITA / POST-CITA:
1. FASE PRE-CITA (Confirmación de asistencia):
Si la variable [Fase de atención] es "Pre-cita", inicia la conversación saludando al paciente, mencionando la fecha, hora y tratamiento agendado, y pregunta si confirma su asistencia.

- Si el paciente NO confirma (no puede asistir):
Responde con amabilidad y pregunta qué día de la semana y en qué bloque horario (mañana o tarde) le acomodaría reagendar para revisar la disponibilidad de la agenda.

- Si el paciente SÍ confirma asistencia:
  * Si el tratamiento NO ES Onicocriptosis: Confirma la cita y despídete cordialmente.
  * Si el tratamiento SÍ ES "Onicocriptosis" (o uña encarnada): Confirma la cita y envía el siguiente mensaje:
  "Excelente, su cita queda confirmada. Por el tipo de procedimiento (onicocriptosis), es requisito indispensable que acuda a la consulta con pantuflas o calzado abierto (chalas). Además, le recomendamos tener a mano en su domicilio algún antiinflamatorio y analgésico de su uso habitual para el manejo del dolor posterior a la despiculización."

2. FASE POST-CITA (Indicaciones de recuperación):
Si la variable [Fase de atención] es "Post-cita" y el tratamiento fue "Onicocriptosis", envía un mensaje preguntando cómo se siente el paciente y entrégale obligatoriamente la siguiente lista de cuidados post-despiculización:

"Para asegurar una correcta recuperación y evitar complicaciones, por favor siga estas indicaciones post-despiculización:

• 🦶 Reposo y postura: Mantenga reposo en la medida de lo posible. Cuando esté sentado o recostado, mantenga el pie en alto para ayudar a desinflamar.
• 🚫💧 Cuidado del vendaje: Es fundamental no mojar ni manipular el vendaje aplicado en la consulta.
• 💊 Manejo del dolor: Tome los analgésicos y antiinflamatorios recomendados o de su uso habitual según lo necesite.
• 🩴 Calzado: Utilice calzado muy cómodo, amplio y preferentemente abierto para evitar cualquier presión sobre el dedo.
• 📅 Control posterior: Recuerde que es necesario agendar su cita de control para evaluar la evolución del tratamiento. ¿Desea que revisemos los horarios disponibles para su control?"
`;

  const tools = {
    functionDeclarations: [
      {
        name: "get_available_hours",
        description: "Obtiene las horas disponibles para una fecha específica.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD" },
          },
          required: ["date"],
        },
      },
      {
        name: "check_patient_status",
        description: "Verifica si un paciente ya está registrado en el sistema.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            nameOrRut: { type: Type.STRING, description: "Nombre completo o RUT del paciente" },
          },
          required: ["nameOrRut"],
        },
      },
      {
        name: "register_patient",
        description: "Registra un nuevo paciente en el sistema.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            phone: { type: Type.STRING },
            rut: { type: Type.STRING },
            dob: { type: Type.STRING },
            notes: { type: Type.STRING, description: "Motivo de la consulta u observaciones" },
          },
          required: ["name", "phone"],
        },
      },
      {
        name: "book_appointment",
        description: "Reserva una cita en el calendario.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            patientId: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            treatmentType: { type: Type.STRING },
          },
          required: ["patientId", "date", "time", "treatmentType"],
        },
      },
    ],
  };

  app.post("/api/assistant", async (req, res) => {
    try {
      const { 
        patientName, 
        appointmentDateTime, 
        treatmentType, 
        stage, 
        lastMessage,
        // New data for tools
        appointments = [],
        patients = [],
        treatments = []
      } = req.body;

      const context = `
        Variables de contexto:
        - [Nombre del paciente]: ${patientName || "No especificado"}
        - [Fecha y hora de la cita actual]: ${appointmentDateTime || "Ninguna"}
        - [Tipo de tratamiento]: ${treatmentType || "Por definir"}
        - [Fase de atención]: ${stage}
        - [Hoy es]: ${new Date().toISOString().split('T')[0]}
      `;

      const contents = [
        ...(req.body.history || [])
          .filter((h: any) => h.text && h.text.trim() !== '')
          .map((h: any) => ({
            role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
          })),
        {
          role: 'user',
          parts: [{ text: lastMessage ? `${context}\n\nMensaje del paciente: ${lastMessage}` : `${context}\n\nInicia la conversación según corresponde.` }]
        }
      ];

      let response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          tools: [tools],
        }
      });
      
      let actions = [];

      // Handle function calling loop
      while (response.functionCalls && response.functionCalls.length > 0) {
        const responses = [];

        for (const call of response.functionCalls) {
          const { name, args } = call;
          let responseData: any = { error: "Tool not implemented" };

          if (name === "get_available_hours") {
            const date = args.date as string;
            const taken = appointments.filter((a: any) => a.date === date).map((a: any) => a.time);
            const allHours = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
            const available = allHours.filter(h => !taken.includes(h));
            responseData = { available_hours: available };
          } else if (name === "check_patient_status") {
            const query = (args.nameOrRut as string).toLowerCase();
            const patient = patients.find((p: any) => p.name.toLowerCase().includes(query) || (p.rut && p.rut.toLowerCase().includes(query)));
            responseData = { is_registered: !!patient, patient: patient || null };
          } else if (name === "register_patient") {
            const newPatient = { ...args, id: `new_${Date.now()}` };
            actions.push({ type: 'REGISTER_PATIENT', data: newPatient });
            responseData = { success: true, patientId: newPatient.id };
          } else if (name === "book_appointment") {
            const newAppt = { ...args, status: 'pending', id: `appt_${Date.now()}` };
            actions.push({ type: 'BOOK_APPOINTMENT', data: newAppt });
            responseData = { success: true, appointment: newAppt };
          }

          responses.push({
            functionResponse: {
              name,
              response: responseData,
            },
          });
        }

        // Add the model's call and our response to the conversation
        // IMPORTANT: We must match the exactly part structure for function calls
        contents.push(response.candidates[0].content);
        contents.push({ role: 'user', parts: responses });

        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTIONS,
            tools: [tools],
          }
        });
      }

      res.json({ 
        text: response.text || "Lo siento, no pude procesar esa solicitud.", 
        actions,
        // Map back to a simple history format for the client, only including text messages
        history: contents
          .filter(c => c.parts?.some(p => p.text))
          .map(c => ({
            role: c.role === 'model' ? 'assistant' : 'user',
            text: c.parts.find(p => p.text)?.text || ''
          }))
      });
    } catch (error: any) {
      console.error("Assistant Error:", error);
      
      // Handle Quota errors specifically
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ 
          error: "Cuota de IA excedida temporalmente. Por favor, espera unos segundos e intenta de nuevo. Si el error persiste, puedes configurar tu propia clave de API en Configuración." 
        });
      }

      res.status(500).json({ error: "No se pudo contactar al asistente. Revise su API Key en la configuración." });
    }
  });

  // WhatsApp Business API Helper
  async function sendWhatsAppMessage(to: string, text: string) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!token || !phoneId) {
      console.warn("Faltan credenciales de WhatsApp en el .env, simulando envío local");
      console.log(`[WhatsApp API MOCK] Enviando a ${to}:\n${text}`);
      return { success: true, mock: true };
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
        const errData = await response.text();
        console.error("WhatsApp API Error:", errData);
        throw new Error("Failed to send WhatsApp message");
    }

    return response.json();
  }

  // Endpoint to send a message programmatically from client
  app.post("/api/whatsapp/send", async (req, res) => {
      try {
          const { phone, message } = req.body;
          const result = await sendWhatsAppMessage(phone, message);
          res.json({ success: true, result });
      } catch(error: any) {
          console.error(error);
          res.status(500).json({ success: false, error: error.message || "Failed to send message" });
      }
  });

  // Verification endpoint for WhatsApp webhook
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === verify_token) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
        res.sendStatus(400);
    }
  });

  // Endpoint to receive messages from WhatsApp
  app.post("/api/whatsapp/webhook", async (req, res) => {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
        const msgBody = body.entry[0].changes[0].value.messages[0].text.body;

        console.log(`[WhatsApp Webhook] Mensaje recibido de ${phoneNumber}: ${msgBody}`);

        // Aquí integramos a la IA para comunicación bidireccional automática
        try {
          // Construimos el contexto y pedimos a Gemini que responda
          const context = `
            Eres el asistente virtual de la clínica podológica. Has recibido un mensaje entrante de un paciente con número ${phoneNumber}.
            Debes responder amable y concisamente. Como no tenemos el historial ni la base de datos en memoria en este webhook, pide al paciente que mencione su nombre y si desea agendar o modificar una cita, para poder derivarlo o darle opciones genéricas.
            Si la respuesta involucra contactarlo de vuelta, dile que un humano le hablará pronto si es necesario.
          `;
          
          let response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              {
                role: 'user',
                parts: [{ text: `${context}\n\nMensaje del paciente: ${msgBody}` }]
              }
            ],
            config: {
              systemInstruction: SYSTEM_INSTRUCTIONS
            }
          });

          // Responder usando el send helper nativo
          if (response.text) {
              await sendWhatsAppMessage(phoneNumber, response.text);
          }
        } catch(error) {
            console.error("Error auto-replying via WhatsApp Webhook:", error);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  app.post("/api/medical-query", async (req, res) => {
    try {
      const { query, patientName, history = [] } = req.body;
      
      const systemPrompt = `Eres un asistente médico experto en podología clínica. Ayudas a podólogos con:
- Diagnóstico diferencial de patologías del pie
- Protocolos de tratamiento y posología
- Indicaciones pre y post operatorias
- Biomecánica y ortopodología
- Dermatología podológica

Responde de forma clara, profesional y estructurada. Usa listas cuando sea apropiado.
Si la consulta involucra un paciente específico, considera su contexto.
IMPORTANTE: Siempre aclara que tu respuesta es orientativa y no reemplaza el juicio clínico profesional.`;

      // Build conversation contents with history for contextual responses
      const contents = [
        ...history
          .filter((h: any) => h.text && h.text.trim() !== '')
          .map((h: any) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }]
          })),
        {
          role: 'user',
          parts: [{
            text: patientName
              ? `[Contexto: Paciente ${patientName}]\n\nConsulta médica: ${query}`
              : `Consulta médica: ${query}`
          }]
        }
      ];

      // Try models in order of preference
      const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
      let lastError: any = null;

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: systemPrompt,
            }
          });
          return res.json({ text: response.text || 'No se pudo generar una respuesta.' });
        } catch (err: any) {
          lastError = err;
          // If it's a model-not-found error, try the next model
          if (err.status === 404 || err.message?.includes("not found")) {
            continue;
          }
          // If it's a quota error, return immediately
          if (err.status === 429 || err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
            return res.status(429).json({
              error: "Cuota de IA excedida temporalmente. Intenta de nuevo en unos segundos."
            });
          }
          // For other errors, try next model
          continue;
        }
      }

      // All models failed
      console.error("Medical Query Error (all models failed):", lastError);
      res.status(500).json({ error: "No se pudo procesar la consulta. Verifica la API Key de Gemini en el archivo .env del servidor." });
    } catch (error: any) {
      console.error("Medical Query Error:", error);
      res.status(500).json({ error: "Error interno del servidor al procesar la consulta médica." });
    }
  });

  // Endpoint to send monthly report to email via Nodemailer
  app.post("/api/send-monthly-report", async (req, res) => {
    try {
      const { email, reportData, pdfBase64 } = req.body;
      
      const transporter = require("nodemailer").createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "fake-email@gmail.com",
          pass: process.env.SMTP_PASS || "dummy-password",
        },
      });

      // HTML Template
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-w-lg; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #064e3b; margin-bottom: 20px;">Tu Reporte Mensual está Listo</h2>
          <p style="font-size: 16px; line-height: 1.5;">Hola,</p>
          <p style="font-size: 16px; line-height: 1.5;">
            Adjunto encontrarás el resumen financiero y de rentabilidad del mes actual generado por tu plataforma <strong>PodoGest</strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.5;">${reportData}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>Este correo fue generado automáticamente. Por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} PodoGest. Todos los derechos reservados.</p>
          </div>
        </div>
      `;

      let attachments = [];
      if (pdfBase64) {
        // Extract base64 data
        const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        attachments.push({
          filename: `Reporte_Mensual_PodoGest_${new Date().toISOString().slice(0,7)}.pdf`,
          content: base64Data,
          encoding: 'base64'
        });
      }

      console.log(`[Email] Preparando envío del reporte mensual a ${email}`);
      
      // Attempt to send email. If mock credentials are used, this may fail, 
      // but we catch and print the error gracefully to let user set it up later.
      if (process.env.SMTP_PASS) {
        await transporter.sendMail({
          from: '"PodoGest Resúmenes" <' + (process.env.SMTP_USER || 'noreply@podogest.com') + '>',
          to: email,
          subject: "Reporte de Cierre Mensual - PodoGest",
          html: htmlContent,
          attachments,
        });
        console.log(`[Email] Correo enviado exitosamente a ${email}`);
      } else {
        console.warn("[Email MOCK] Como no hay credenciales SMTP en el .env, simularemos el envío.");
        console.log("[Email MOCK] HTML:", htmlContent);
        if (pdfBase64) console.log("[Email MOCK] PDF Adjunto generado con longitud: " + pdfBase64.length);
      }

      return res.json({ success: true, message: `Reporte enviado exitosamente a ${email}` });
    } catch(error: any) {
      console.error("[Email Error] Error enviando correo:", error);
      res.status(500).json({ success: false, error: "Failed to send report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

