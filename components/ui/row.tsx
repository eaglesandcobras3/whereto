import * as React from "react"

import { cn } from "@/lib/utils"

type RowProps = React.ComponentProps<"div"> & {
  leading?: React.ReactNode
  trailing?: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** When true, omit the hairline above this row (use on first item). */
  first?: boolean
}

function Row({
  className,
  leading,
  trailing,
  title,
  subtitle,
  children,
  first,
  ...props
}: RowProps) {
  return (
    <div
      data-slot="row"
      className={cn("dls-row", first && "border-t-0", className)}
      {...props}
    >
      {leading ? (
        <div className="dls-row-leading" data-slot="row-leading">
          {leading}
        </div>
      ) : null}
      <div className="dls-row-content" data-slot="row-content">
        {title ? (
          <div className="text-title-md truncate">{title}</div>
        ) : null}
        {subtitle ? (
          <div className="text-body-sm text-[var(--color-muted)] truncate">
            {subtitle}
          </div>
        ) : null}
        {children}
      </div>
      {trailing ? (
        <div className="dls-row-trailing" data-slot="row-trailing">
          {trailing}
        </div>
      ) : null}
    </div>
  )
}

function RowGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="row-group"
      className={cn("divide-y divide-[var(--color-hairline-soft)]", className)}
      {...props}
    />
  )
}

export { Row, RowGroup }
