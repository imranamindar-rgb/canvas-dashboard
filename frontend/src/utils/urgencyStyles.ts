export const URGENCY_STYLES: Record<string, string> = {
  overdue: "bg-gray-200 text-gray-600",
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  runway: "bg-green-100 text-green-800",
};

export const CARD_BG: Record<string, string> = {
  overdue: "bg-gray-100 border-gray-300",
  critical: "bg-red-50 border-red-200",
  high: "bg-orange-50 border-orange-200",
  medium: "bg-white border-gray-200",
  runway: "bg-white border-gray-200",
};

export const ROW_BG: Record<string, string> = {
  overdue: "bg-gray-100",
  critical: "bg-red-50",
  high: "bg-orange-50",
  medium: "",
  runway: "",
};

export const ROW_HOVER: Record<string, string> = {
  overdue: "hover:bg-gray-200",
  critical: "hover:bg-red-100",
  high: "hover:bg-orange-100",
  medium: "hover:bg-gray-50",
  runway: "hover:bg-gray-50",
};
