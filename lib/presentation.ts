export const formatCurrency = (value: number | null | undefined) =>
  `Rs. ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)}`;

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const getAvatarTone = (seed: number) => {
  const tones = [
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-orange-100", text: "text-orange-700" },
    { bg: "bg-teal-100", text: "text-teal-700" },
    { bg: "bg-purple-100", text: "text-purple-700" },
    { bg: "bg-zinc-100", text: "text-zinc-700" },
  ];
  return tones[seed % tones.length];
};
