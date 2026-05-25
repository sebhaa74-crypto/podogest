const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qmtqdqqaqxtwahdbbuni.supabase.co',
  'sb_publishable_IF78JW353KKlzT7PXsfmcA_rnJUOMP9'
);

async function run() {
  // 1. Find Yarella's specialist ID
  const { data: specs, error: specError } = await supabase.from('specialists').select('*').ilike('name', '%Yarella%');
  
  let specialistId = null;
  if (specs && specs.length > 0) {
    specialistId = specs[0].id;
    console.log(`Found Yarella: ${specs[0].name} (ID: ${specialistId})`);
  } else {
    // If she doesn't exist, create a dummy profile (or maybe it's just 'yarella' id)
    specialistId = 'esp-yarella-' + Date.now();
    await supabase.from('specialists').insert({ id: specialistId, name: 'Yarella' });
    console.log(`Created new specialist Yarella (ID: ${specialistId})`);
  }

  const appointmentsData = [
    { name: 'Nelly', phone: '+56 9 8900 0230', time: '17:30' },
    { name: 'Carmen Gloria', phone: '+56 9 5987 7839', time: '16:45' },
    { name: 'Marioly Astete', phone: '+56 9 5678 5766', time: '16:00' },
    { name: 'Héctor gallardo', phone: '+56 9 6842 8699', time: '15:00' }
  ];

  const targetDate = '2026-05-25';

  for (const p of appointmentsData) {
    // Check if patient exists by phone
    let { data: existingPatients } = await supabase.from('patients').select('*').eq('phone', p.phone);
    let patientId = null;
    
    if (existingPatients && existingPatients.length > 0) {
      patientId = existingPatients[0].id;
      console.log(`Patient ${p.name} already exists (ID: ${patientId})`);
    } else {
      patientId = 'pat-' + Date.now() + Math.floor(Math.random() * 1000);
      await supabase.from('patients').insert({
        id: patientId,
        name: p.name,
        phone: p.phone,
        email: '',
        notes: 'Añadido automáticamente vía script',
        specialist_id: specialistId
      });
      console.log(`Created patient ${p.name} (ID: ${patientId})`);
    }

    // Insert Appointment
    await supabase.from('appointments').insert({
      id: 'apt-' + Date.now() + Math.floor(Math.random() * 1000),
      patient_id: patientId,
      specialist_id: specialistId,
      date: targetDate,
      time: p.time,
      treatment_type: 'Consulta General',
      status: 'pending',
      notes: 'Agendado automáticamente'
    });
    console.log(`Scheduled appointment for ${p.name} at ${p.time}`);
  }
}

run().catch(console.error);
