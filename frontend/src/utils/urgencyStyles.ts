export const URGENCY_STYLES: Record<string, string> = {
  overdue: "bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  runway: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export const URGENCY_BORDER: Record<string, string> = {
  overdue: "border-l-gray-400 dark:border-l-zinc-500",
  critical: "border-l-red-500 dark:border-l-red-400",
  high: "border-l-orange-500 dark:border-l-orange-400",
  medium: "border-l-blue-500 dark:border-l-blue-400",
  runway: "border-l-green-500 dark:border-l-green-400",
};

export const CARD_BG: Record<string, string> = {
  overdue: "bg-gray-50 border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  critical: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  high: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  medium: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
  runway: "bg-white border-gray-200 dark:bg-zinc-800/50 dark:border-zinc-700",
};

export const ROW_BG: Record<string, string> = {
  overdue: "",
  critical: "",
  high: "",
  medium: "",
  runway: "",
};

export const ROW_HOVER: Record<string, string> = {
  overdue: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  critical: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  high: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  medium: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
  runway: "hover:bg-gray-50 dark:hover:bg-zinc-800/50",
};
