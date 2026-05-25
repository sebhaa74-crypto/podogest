const fs = require('fs');

let content = fs.readFileSync('src/components/AgendaView.tsx', 'utf-8');

const regex = /\/\/ Auto-send reminders simulation[\s\S]*?\}, \[appointments, autoRemindersEnabled\]\);/g;

const replacement = `  // Auto-send reminders simulation
  useEffect(() => {
    if (!autoRemindersEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      appointments.forEach((appt) => {
        const apptDate = new Date(\`\${appt.date}T\${formatTime(appt.time)}:00\`);
        const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const minutesDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60);
        const patient = patients.find(p => p.id === appt.patientId);
        
        if (!patient) return;

        // 1. Send reminder 24 hours before
        if (hoursDiff > 0 && hoursDiff <= 24 && !appt.reminderSent && appt.status === 'pending') {
          try {
            addNotification({
              title: \`Cita Próxima (24h)\`,
              message: \`Mañana a las \${formatTime(appt.time)} con \${patient.name} (\${appt.treatmentType}).\`,
              type: 'info'
            });
            updateAppointment(appt.id, { ...appt, reminderSent: true });
          } catch (error) {
            console.error('Error al generar notificación 24h', error);
          }
        }

        // 2. Send reminder 15 mins before
        if (minutesDiff > 0 && minutesDiff <= 15 && !appt.reminder15mSent && appt.status === 'pending') {
          try {
            addNotification({
              title: \`Cita en 15 minutos\`,
              message: \`Atención: Cita con \${patient.name} a las \${formatTime(appt.time)} (\${appt.treatmentType}).\`,
              type: 'warning',
              category: 'appointment'
            });
            updateAppointment(appt.id, { ...appt, reminder15mSent: true });
          } catch (error) {
            console.error('Error al generar notificación 15m', error);
          }
        }

        // 3. Send unpaid reminder every 48 hours for completed unpaid appointments
        if (appt.status === 'completed' && !appt.paid) {
           const hoursSinceCompletion = (now.getTime() - apptDate.getTime()) / (1000 * 60 * 60);
           const reminderLevel = Math.floor(hoursSinceCompletion / 48);
           const currentLevel = appt.unpaidReminderLevel || 0;
           
           if (reminderLevel > 0 && reminderLevel > currentLevel) {
             try {
               addNotification({
                 title: \`Pago Pendiente\`,
                 message: \`El paciente \${patient.name} tiene un pago pendiente desde la cita del \${appt.date}.\`,
                 type: 'alert'
               });
               updateAppointment(appt.id, { ...appt, unpaidReminderLevel: reminderLevel });
             } catch (error) {
               console.error('Error al generar notificación de cobro', error);
             }
           }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [appointments, autoRemindersEnabled, patients, addNotification, updateAppointment]);`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/AgendaView.tsx', content, 'utf-8');
console.log('Fixed AgendaView');
