import { mediaUrl } from "@/lib/media";

type AvatarSize = "xxs" | "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  xxs: "w-5 rounded",
  xs: "w-8 rounded",
  sm: "w-16 rounded",
  md: "w-20 rounded",
  lg: "w-32 rounded",
};

type AvatarProps = {
  src?: string | null;
  username?: string | null;
  size?: AvatarSize;
  className?: string;
};

function initialFromUsername(username?: string | null): string {
  const clean = (username ?? "").trim().replace(/^@/, "");
  if (!clean) return "?";
  return clean[0].toUpperCase();
}

export default function Avatar({ src, username, size = "sm", className }: AvatarProps) {
  const resolved = mediaUrl(src);
  const initial = initialFromUsername(username);
  const classes = [
    "rounded-full",
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={resolved ? "avatar" : "avatar avatar-placeholder"}>
      <div className={resolved ? classes : "bg-neutral text-neutral-content rounded-full "+sizeClasses[size]} aria-label={username ? `@${username} avatar` : "Avatar"}>
        {resolved ? <img src={resolved} alt="" className="h-full w-full object-cover"/> : <span>{initial}</span>}
      </div>
    </div>
  );
}
