const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');
const searchStr = `  // Average Size Ratio across all target entries`;

const newCode = `  // --- Fabric Save/Loss Calculations ---
  let total_fabric_save_loss_kg = 0;
  let total_fabric_used_for_save_loss = 0;
  
  let today_fabric_save_loss_kg = 0;
  let today_fabric_used_for_save_loss = 0;

  targetEntries.forEach(e => {
    const totalCutQty = (Number(e.lay) || 0) * (Number(e.ratio) || 0);
    const bookingCons = (e.booking_consumption !== undefined && e.booking_consumption !== null) ? Number(e.booking_consumption) : null;
    const cuttingCons = totalCutQty > 0 ? (Number(e.fabric_used_kg) / totalCutQty) * 12 : null;
    const bookingVsCut = (bookingCons !== null && cuttingCons !== null) ? (bookingCons - cuttingCons) : null;
    const fabricSaveLossPct = (bookingCons && bookingVsCut !== null) ? (bookingVsCut / bookingCons) * 100 : null;
    const fabricSaveLossKg = (fabricSaveLossPct !== null && e.fabric_used_kg) ? Number(e.fabric_used_kg) * (fabricSaveLossPct / 100) : null;

    if (fabricSaveLossKg !== null && e.fabric_used_kg) {
      total_fabric_save_loss_kg += fabricSaveLossKg;
      total_fabric_used_for_save_loss += Number(e.fabric_used_kg);
      
      if (e.entry_date === latestDateStr) {
        today_fabric_save_loss_kg += fabricSaveLossKg;
        today_fabric_used_for_save_loss += Number(e.fabric_used_kg);
      }
    }
  });

  const total_fabric_save_loss_percent = total_fabric_used_for_save_loss > 0 
    ? (total_fabric_save_loss_kg / total_fabric_used_for_save_loss) * 100 
    : 0;
    
  const today_fabric_save_loss_percent = today_fabric_used_for_save_loss > 0 
    ? (today_fabric_save_loss_kg / today_fabric_used_for_save_loss) * 100 
    : 0;

` + searchStr;

code = code.replace(searchStr, newCode);
fs.writeFileSync('src/utils/calculations.ts', code);
