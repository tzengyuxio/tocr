import { createElement, type ReactNode } from "react";
import { FolderOpen, Gamepad2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categoryLabel, type ArticleCategory } from "@/lib/article-categories";
import {
  formatTagLabel,
  getTagTypeColor,
  getTagTypeIcon,
  getTagTypeLabel,
} from "@/lib/tag-colors";

/**
 * The three families of chip that hang off an article: its category, the games
 * it covers, and its tags. One place for all three so the same thing does not
 * end up outlined on one page, filled on another and iconless on a third --
 * which is where they had drifted to.
 *
 * The icon carries the meaning and the colour reinforces it. At the `-100`
 * tint eight hues are not reliably distinguishable, so the shape has to do the
 * work; the tint is what makes a row of chips scannable.
 *
 * The hues are the ones the OCR review screen chose (amber, violet) plus the
 * six tag types.
 */

const CHIP = "gap-1 border-0 font-normal";

export const CATEGORY_CHIP_COLOR = "bg-amber-100 text-amber-800";

/**
 * The one chip that does not sit at the -100 tint. What a magazine article was
 * about is mostly which game it was about, so in a list where every row also
 * carries a category and a tag or two, the game is the one a reader is
 * scanning for and it gets the weight to match.
 */
export const GAME_CHIP_COLOR = "bg-violet-600 text-white";

/** `children` is appended after the label -- editors hang a remove button there. */
interface ChipProps {
  className?: string;
  children?: ReactNode;
}

export function CategoryChip({
  category,
  className,
  children,
}: ChipProps & { category: ArticleCategory }) {
  return (
    <Badge
      variant="secondary"
      className={cn(CHIP, CATEGORY_CHIP_COLOR, className)}
      title={`分類：${categoryLabel(category)}`}
    >
      <FolderOpen className="h-3 w-3" />
      {categoryLabel(category)}
      {children}
    </Badge>
  );
}

export function GameChip({
  name,
  className,
  children,
}: ChipProps & { name: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(CHIP, GAME_CHIP_COLOR, className)}
      title={`遊戲：${name}`}
    >
      <Gamepad2 className="h-3 w-3" />
      {name}
      {children}
    </Badge>
  );
}

export function TagChip({
  tag,
  withTypeLabel = false,
  className,
  children,
}: ChipProps & {
  tag: { name: string; type: string };
  /** Spells the type out as "名稱 (公司)" -- for lists where tags of every
      type sit together and the icon alone is doing too much work. */
  withTypeLabel?: boolean;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(CHIP, getTagTypeColor(tag.type), className)}
      // The type is otherwise carried by a 12px glyph and a tint the
      // convention doc admits is not reliably separable; the tooltip is what a
      // reader falls back on.
      title={
        tag.type === "GENERAL"
          ? `標籤：${tag.name}`
          : `${getTagTypeLabel(tag.type)}標籤：${tag.name}`
      }
    >
      {/* createElement, not <Icon />: a component read out of a lookup table
          and rendered as JSX trips react-hooks/static-components, which cannot
          tell it from one built during render. */}
      {createElement(getTagTypeIcon(tag.type), { className: "h-3 w-3" })}
      {withTypeLabel ? formatTagLabel(tag) : tag.name}
      {children}
    </Badge>
  );
}

/**
 * The tag *type* itself as a chip -- a legend on the tag index, the type
 * column in the admin table, the type shown beside a name in a picker.
 *
 * A separate component rather than `<TagChip tag={{ name: 型別中文, type }} />`,
 * which several places used to do: that only looked right because TagChip
 * renders the name verbatim, and it would have produced "標籤：公司" as a
 * tooltip and "公司 (公司)" under withTypeLabel.
 */
export function TagTypeChip({ type, className }: ChipProps & { type: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(CHIP, getTagTypeColor(type), className)}
      title={`標籤類型：${getTagTypeLabel(type)}`}
    >
      {createElement(getTagTypeIcon(type), { className: "h-3 w-3" })}
      {getTagTypeLabel(type)}
    </Badge>
  );
}

/**
 * A remove button parked on a chip's corner, for the editing screens.
 *
 * Pass it as a chip's `children` together with `REMOVABLE_CHIP` on the
 * className -- the badge clips its children by default, which would swallow a
 * button sitting outside the box.
 */
export const REMOVABLE_CHIP = "group/chip relative overflow-visible";

export function ChipRemoveButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`移除 ${label}`}
      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover/chip:opacity-100"
      onClick={(e) => {
        // The row underneath starts editing on click.
        e.stopPropagation();
        onRemove();
      }}
    >
      <X className="h-2.5 w-2.5" strokeWidth={3} />
    </button>
  );
}
