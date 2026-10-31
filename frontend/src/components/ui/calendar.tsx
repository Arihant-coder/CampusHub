import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar w-full p-3 [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("relative w-full", defaultClassNames.root, classNames?.root),
        months: cn(
          "relative flex flex-col gap-4 w-full",
          defaultClassNames.months,
          classNames?.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month, classNames?.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10",
          defaultClassNames.nav,
          classNames?.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 select-none p-0 aria-disabled:opacity-50 hover:bg-muted text-muted-foreground hover:text-foreground",
          defaultClassNames.button_previous,
          classNames?.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 select-none p-0 aria-disabled:opacity-50 hover:bg-muted text-muted-foreground hover:text-foreground",
          defaultClassNames.button_next,
          classNames?.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center px-8",
          defaultClassNames.month_caption,
          classNames?.month_caption
        ),
        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
          classNames?.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root,
          classNames?.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown,
          classNames?.dropdown
        ),
        caption_label: cn(
          "select-none font-semibold text-sm tracking-tight text-foreground",
          captionLayout === "label"
            ? ""
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label,
          classNames?.caption_label
        ),
        month_grid: cn(
          "w-full border-collapse table-fixed",
          defaultClassNames.month_grid,
          classNames?.month_grid
        ),
        weekdays: cn(
          "w-full",
          defaultClassNames.weekdays,
          classNames?.weekdays
        ),
        weekday: cn(
          "text-muted-foreground font-medium text-xs text-center p-0 h-8 align-middle select-none",
          defaultClassNames.weekday,
          classNames?.weekday
        ),
        weeks: cn(
          "w-full",
          defaultClassNames.weeks,
          classNames?.weeks
        ),
        week: cn(
          "w-full",
          defaultClassNames.week,
          classNames?.week
        ),
        week_number_header: cn(
          "w-8 select-none",
          defaultClassNames.week_number_header,
          classNames?.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number,
          classNames?.week_number
        ),
        day: cn(
          "relative h-9 sm:h-10 p-0.5 text-center align-middle select-none",
          defaultClassNames.day,
          classNames?.day
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start,
          classNames?.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle, classNames?.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end, classNames?.range_end),
        today: cn(
          defaultClassNames.today,
          classNames?.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
          classNames?.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
          classNames?.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden, classNames?.hidden),
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn("relative", className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const { className: _rdpClassName, ...restProps } = props as any

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      {...restProps}
      className={cn(
        "size-8 sm:size-9 mx-auto p-0 font-normal text-xs sm:text-sm rounded-lg flex items-center justify-center transition-colors",
        modifiers.selected
          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground shadow-xs"
          : modifiers.today
            ? "border border-primary font-semibold text-primary hover:bg-accent hover:text-accent-foreground"
            : "hover:bg-muted text-foreground",
        modifiers.outside && "text-muted-foreground/30 pointer-events-none hover:bg-transparent",
        defaultClassNames.day_button,
        className
      )}
    />
  )
}

export { Calendar, CalendarDayButton }
