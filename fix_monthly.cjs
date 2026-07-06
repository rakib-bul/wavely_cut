const fs = require('fs');
let code = fs.readFileSync('src/components/KPICards.tsx', 'utf8');

const search = `    [
      "gross-fabric", "fabric-spread", "cutting-scrap", "cad-eff", "ete-eff", "eff-gap",
      "month-total", "total-lots", "total-layers", "total-qty", "total-used-inch",
      "total-remnants-issued", "total-remnants-used", "total-remnants-scrap",
      "total-remnants-utilization", "total-reject-qty"
    ]`;

const repl = `    [
      "gross-fabric", "fabric-spread", "cutting-scrap", "cad-eff", "ete-eff", "eff-gap",
      "month-total", "total-lots", "total-layers", "total-qty", "total-used-inch",
      "total-fabric-save-loss-pct", "total-fabric-save-loss-kg",
      "total-remnants-issued", "total-remnants-used", "total-remnants-scrap",
      "total-remnants-utilization", "total-reject-qty"
    ]`;

code = code.replace(search, repl);
fs.writeFileSync('src/components/KPICards.tsx', code);
