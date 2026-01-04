import type { ReactNode } from "react";
import { mediaThumbUrl, mediaUrl } from "@/lib/media";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

type PlaceholderVariant = "base" | "mantle";

type ProfileCoverProps = {
  coverUrl?: string | null;
  alt?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  placeholder?: ReactNode;
  placeholderVariant?: PlaceholderVariant;
};

export default function ProfileCover({
  coverUrl,
  alt = "Cover",
  imgClassName,
  placeholderClassName,
  placeholder = "No cover",
  placeholderVariant = "base",
}: ProfileCoverProps) {
  const resolvedThumb = mediaThumbUrl(coverUrl, "lg");
  const resolved = mediaUrl(coverUrl);

  if (resolved) {
    return (
      <img
        src={resolvedThumb ?? resolved}
        alt={alt}
        className={imgClassName}
      />
    );
  }

  return (
    <MediaPlaceholder className={placeholderClassName} variant={placeholderVariant}>
      {placeholder}
    </MediaPlaceholder>
  );
}
