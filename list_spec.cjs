const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://qmtqdqqaqxtwahdbbuni.supabase.co',
  'sb_publishable_IF78JW353KKlzT7PXsfmcA_rnJUOMP9'
);

async function listSpecialists() {
  const { data, error } = await supabase.from('specialists').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
listSpecialists();
