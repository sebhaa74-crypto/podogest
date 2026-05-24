import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmtqdqqaqxtwahdbbuni.supabase.co';
const supabaseKey = 'sb_publishable_IF78JW353KKlzT7PXsfmcA_rnJUOMP9';

export const supabase = createClient(supabaseUrl, supabaseKey);
