const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const search = `    today_fabric_save_loss_percent?: number;
    today_fabric_save_loss_kg?: number;`;
const repl = `    today_fabric_save_loss_percent?: number;
    today_fabric_save_loss_kg?: number;
    today_booking_vs_marker?: number;
    today_booking_vs_cut?: number;`;

code = code.replace(search, repl);
fs.writeFileSync('src/components/KPICards.tsx', code);
