import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/media";
import MediaPlaceholder from "@/components/MediaPlaceholder";

type PlaceholderVariant = "base" | "mantle";

type BookCoverProps = {
  coverUrl?: string | null;
  title?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  placeholder?: ReactNode;
  placeholderVariant?: PlaceholderVariant;
};

export default function BookCover({
  coverUrl,
  title,
  alt,
  className,
  imgClassName,
  placeholderClassName,
  placeholder = "—",
  placeholderVariant,
}: BookCoverProps) {
  const resolved = mediaUrl(coverUrl);
  const altText = alt ?? (title ? `${title} cover` : "Book cover");
  const imgClasses = [
    "rounded-sm object-cover",
    className,
    imgClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const placeholderClasses = [className, placeholderClassName].filter(Boolean).join(" ");

  if (resolved) {
    return <img src={resolved} alt={altText} className={imgClasses} />;
  }

  return (
    <MediaPlaceholder className={placeholderClasses} variant={placeholderVariant}>
      {placeholder}
    </MediaPlaceholder>
  );
}
