import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Check, X, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { getNotificationCopy } from "@/lib/notificationCopy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const Notifications = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, remove } =
    useNotifications();
  const [page, setPage] = useState(1);

  // Unread first, then by created_at desc
  const sorted = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aUnread = !a.read_at ? 1 : 0;
      const bUnread = !b.read_at ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Bell className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Sign in to see notifications</h1>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold truncate">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
            <Inbox className="h-10 w-10" />
            <p>No notifications yet</p>
            <p className="text-sm">When people interact with your villages, spots, and events, you'll see it here.</p>
          </div>
        ) : (
          <>
            <ul className="rounded-lg border border-border divide-y divide-border bg-card overflow-hidden">
              {pageItems.map((n) => {
                const copy = getNotificationCopy(n);
                const isUnread = !n.read_at;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "group flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors",
                      isUnread && "bg-accent/20"
                    )}
                  >
                    <button
                      onClick={() => {
                        if (isUnread) markAsRead(n.id);
                        navigate(copy.href);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium truncate">{copy.title}</p>
                      </div>
                      {copy.body && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {copy.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(n.id)}
                          aria-label="Mark as read"
                          className="h-8 w-8"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(n.id)}
                        aria-label="Dismiss"
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      className={cn(
                        "cursor-pointer",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(i + 1);
                        }}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={cn(
                        "cursor-pointer",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
