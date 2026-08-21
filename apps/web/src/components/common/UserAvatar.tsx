import React from "react";

interface UserAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  size = "sm",
  showStatus = false,
}) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const sizeClasses =
    size === "sm"
      ? "w-5 h-5 text-[10px]"
      : size === "md"
      ? "w-7 h-7 text-xs"
      : "w-9 h-9 text-sm";

  return (
    <div className="relative inline-flex items-center shrink-0">
      <div
        className={`flex items-center justify-center font-mono font-medium rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 ${sizeClasses}`}
        title={name}
      >
        {initials}
      </div>
      {showStatus && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </div>
  );
};
