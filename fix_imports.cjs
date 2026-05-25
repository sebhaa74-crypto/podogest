const fs = require('fs');

function addFormatTimeImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('formatTime')) {
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+["']\.\.\/lib\/utils["'];/, (match, p1) => {
      if (p1.includes('formatTime')) return match;
      return `import { ${p1.trim()}, formatTime } from '../lib/utils';`;
    });
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed imports in ' + filePath);
  }
}

addFormatTimeImport('src/components/DashboardView.tsx');
addFormatTimeImport('src/components/PatientDetailModal.tsx');
