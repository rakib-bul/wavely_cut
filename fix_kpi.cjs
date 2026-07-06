const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const brokenStr = `    {
      id: "today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",
      title: "Today's Reject Pieces",`;

const fixedStr = `    {
      id: "today-reject-qty",
      title: "Today's Reject Pieces",`;

code = code.replace(brokenStr, fixedStr);

const arrayStart = `    "today-reject-qty",
    "daily-trend",`;
const arrayEnd = `    "today-reject-qty",
    "today-fabric-save-loss-pct",
    "today-fabric-save-loss-kg",
    "daily-trend",`;
    
code = code.replace(arrayStart, arrayEnd);
fs.writeFileSync('src/components/KPICards.tsx', code);
