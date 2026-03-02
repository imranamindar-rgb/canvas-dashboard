// 8-color palette for course tags (Tailwind CSS classes)
const PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"  },
  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"   },
  { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"    },
  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200"   },
  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
];

// Simple hash of a string → consistent palette index
function hashIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

export function getCourseColor(courseName: string) {
  return PALETTE[hashIndex(courseName)];
}
