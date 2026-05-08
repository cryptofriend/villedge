import { AppNotification } from "@/hooks/useNotifications";

interface NotificationCopy {
  title: string;
  body?: string;
  href: string;
}

export function getNotificationCopy(n: AppNotification): NotificationCopy {
  const d = n.data || {};
  const villageHref = n.parent_entity_type === "village" && n.parent_entity_id ? `/${n.parent_entity_id}` : "/";

  switch (n.type) {
    case "village.application_received":
      return {
        title: `New application from ${d.nickname ?? "someone"}`,
        body: d.village_name ? `for ${d.village_name}` : undefined,
        href: `/${n.parent_entity_id}/residents`,
      };
    case "village.host_added":
      return {
        title: `You were added as ${d.role ?? "co-host"}`,
        body: d.village_name,
        href: `/${n.entity_id}`,
      };
    case "spot.joined":
      return { title: `Someone joined ${d.spot_name ?? "your spot"}`, href: `${villageHref}/map` };
    case "spot.commented":
      return {
        title: `${d.author_name ?? "Someone"} commented on ${d.spot_name ?? "your spot"}`,
        body: d.excerpt,
        href: `${villageHref}/map`,
      };
    case "housing.booked":
      return {
        title: `${d.room_name ?? "Room"} was booked`,
        body: `${d.start_date} → ${d.end_date}`,
        href: villageHref,
      };
    case "event.created":
      return { title: `New event: ${d.title}`, body: d.village_name, href: `${villageHref}/events` };
    case "scenius.created":
      return { title: `New scenius project: ${d.name}`, body: d.village_name, href: `${villageHref}/scenius` };
    case "scenius.contributor_added":
      return { title: `You were added to scenius “${d.name}”`, href: `${villageHref}/scenius` };
    case "bulletin.posted":
      return { title: `${d.author_name ?? "Someone"} posted on the bulletin`, body: d.excerpt, href: `${villageHref}/bulletin` };
    case "bulletin.reaction":
      return { title: `New ${d.reaction ?? "reaction"} on bulletin`, body: d.excerpt, href: `${villageHref}/bulletin` };
    case "proposal.created":
      return { title: `New proposal: ${d.title}`, body: d.author_name, href: `${villageHref}/treasury` };
    case "connection.followed":
      return { title: `Someone followed you`, href: `/profile/me` };
    case "connection.reveal_requested":
      return { title: `Someone requested to connect`, href: `/profile/me` };
    case "connection.reveal_approved":
      return { title: `Your connection request was approved`, href: `/profile/me` };
    default:
      return { title: n.type, href: "/" };
  }
}
