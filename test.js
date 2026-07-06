function getCurrentProductionDateAndShift() {
  const now = new Date();
  const hours = now.getHours();
  let shift = "A"; 
  let prodDate = new Date(now);
  if (hours >= 0 && hours < 8) {
    prodDate.setDate(prodDate.getDate() - 1);
    shift = "B";
  } else if (hours >= 20 && hours <= 23) {
    shift = "B";
  }
  const year = prodDate.getFullYear();
  const month = String(prodDate.getMonth() + 1).padStart(2, '0');
  const day = String(prodDate.getDate()).padStart(2, '0');
  
  return {
    entry_date: `${year}-${month}-${day}`,
    shift
  };
}
console.log(getCurrentProductionDateAndShift());
