import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { ButtonProps, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = ({ ref, className, ...props }: React.ComponentPropsWithRef<"ul">) => (
  <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
);
PaginationContent.displayName = "PaginationContent";
