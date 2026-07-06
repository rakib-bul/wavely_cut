const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');
const searchStr = `    today_avg_size_ratio
  };
}`;

const newCode = `    today_avg_size_ratio,
    total_fabric_save_loss_kg,
    total_fabric_save_loss_percent,
    today_fabric_save_loss_kg,
    today_fabric_save_loss_percent
  };
}`;

code = code.replace(searchStr, newCode);
fs.writeFileSync('src/utils/calculations.ts', code);
