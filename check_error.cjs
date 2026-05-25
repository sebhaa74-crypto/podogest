const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qmtqdqqaqxtwahdbbuni.supabase.co',
  'sb_publishable_IF78JW353KKlzT7PXsfmcA_rnJUOMP9'
);

async function check() {
  const { data, error } = await supabase.from('specialists').insert({ id: 'test', name: 'test' });
  console.log('Error:', error);
}

check();
