import Image from "next/image";

import logo from "../../../../../assets/logo.png";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={logo}
        alt="Cairnly"
        priority
        className="h-9 w-9 rounded-card border border-border bg-bg object-cover"
      />
      {!compact ? (
        <div className="leading-tight">
          <p className="font-semibold tracking-[-0.02em] text-text">Cairnly</p>
          <p className="text-[12px] text-muted">Mark the path.</p>
        </div>
      ) : null}
    </div>
  );
}
