import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";

interface CustomDatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void; // YYYY-MM-DD
  className?: string;
  placeholderText?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  selectedDate, 
  onChange, 
  className = "",
  placeholderText = "Select Date"
}) => {
  // Convert YYYY-MM-DD string to Date object
  const dateValue = selectedDate ? new Date(selectedDate + "T00:00:00") : null;

  const handleChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
  };

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <DatePicker
        selected={dateValue}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        className="w-full h-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 pl-10 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-750 dark:text-slate-200 transition shadow-xs cursor-pointer"
        wrapperClassName="w-full"
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Calendar size={16} />
      </div>
    </div>
  );
};
