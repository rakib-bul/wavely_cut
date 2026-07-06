const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const search = `    today_avg_size_ratio?: number;`;
const replacement = `    today_avg_size_ratio?: number;
    total_fabric_save_loss_percent?: number;
    total_fabric_save_loss_kg?: number;
    today_fabric_save_loss_percent?: number;
    today_fabric_save_loss_kg?: number;`;

code = code.replace(search, replacement);
fs.writeFileSync('src/components/KPICards.tsx', code);
