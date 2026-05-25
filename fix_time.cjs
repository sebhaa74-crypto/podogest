const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/AgendaView.tsx',
  'src/components/DashboardView.tsx',
  'src/components/PatientDetailModal.tsx',
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Add import if not exists
  if (!content.includes('formatTime')) {
    content = content.replace(/import \{ cn, formatCurrency \} from '\.\.\/lib\/utils';/, "import { cn, formatCurrency, formatTime } from '../lib/utils';");
    content = content.replace(/import \{ cn \} from '\.\.\/lib\/utils';/, "import { cn, formatTime } from '../lib/utils';");
  }

  // Replace {appt.time} with {formatTime(appt.time)}
  content = content.replace(/\{appt\.time\}/g, "{formatTime(appt.time)}");
  
  // Also handle template literals: ${appt.time}
  content = content.replace(/\$\{appt\.time\}/g, "${formatTime(appt.time)}");

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated ' + file);
}
