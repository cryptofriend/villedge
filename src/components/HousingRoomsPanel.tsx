import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, Trash2, Pencil, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getBestAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHousingRooms, HousingRoom } from "@/hooks/useHousingRooms";

interface Props {
  spotId: string;
  canManage: boolean;
}

export const HousingRoomsPanel = ({ spotId, canManage }: Props) => {
  const { user } = useAuth();
  const { rooms, bookings, addRoom, updateRoom, deleteRoom, bookRoom, cancelBooking } =
    useHousingRooms(spotId);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", currency: "USD", capacity: "1" });

  const resetForm = () => setForm({ name: "", description: "", price: "", currency: "USD", capacity: "1" });

  const startEdit = (r: HousingRoom) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description || "",
      price: String(r.price),
      currency: r.currency,
      capacity: String(r.capacity),
    });
    setShowAdd(true);
  };

  const submitForm = async () => {
    if (!form.name.trim() || !form.price) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price) || 0,
      currency: form.currency || "USD",
      capacity: Number(form.capacity) || 1,
    };
    if (editingId) {
      await updateRoom(editingId, payload);
    } else {
      await addRoom(payload);
    }
    setShowAdd(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Rooms</h4>
        {canManage && !showAdd && (
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add room
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            placeholder="Room name (e.g. Garden suite)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-8"
          />
          <Textarea
            placeholder="Short description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="text-xs"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Price</Label>
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 4) })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Capacity</Label>
              <Input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setShowAdd(false); setEditingId(null); resetForm(); }}>
              Cancel
            </Button>
            <Button size="sm" className="h-7" onClick={submitForm}>
              {editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {rooms.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground">No rooms listed yet.</p>
      )}

      <div className="space-y-2">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.room_id === room.id);
          return (
            <RoomCard
              key={room.id}
              room={room}
              bookings={roomBookings}
              currentUserId={user?.id || null}
              canManage={canManage}
              onEdit={() => startEdit(room)}
              onDelete={() => deleteRoom(room.id)}
              onBook={(s, e, n) => bookRoom(room.id, s, e, n)}
              onCancelBooking={(id) => cancelBooking(id)}
            />
          );
        })}
      </div>
    </div>
  );
};

interface RoomCardProps {
  room: HousingRoom;
  bookings: ReturnType<typeof useHousingRooms>["bookings"];
  currentUserId: string | null;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBook: (start: string, end: string, notes?: string) => Promise<unknown>;
  onCancelBooking: (id: string) => void;
}

const RoomCard = ({ room, bookings, currentUserId, canManage, onEdit, onDelete, onBook, onCancelBooking }: RoomCardProps) => {
  const [showBook, setShowBook] = useState(false);
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const isBookedDay = (d: Date) =>
    bookings.some((b) => {
      const s = parseISO(b.start_date);
      const e = parseISO(b.end_date);
      return d >= s && d < e;
    });

  const submit = async () => {
    if (!start || !end) return;
    setBusy(true);
    const res = await onBook(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"), notes || undefined);
    setBusy(false);
    if (res) {
      setShowBook(false);
      setStart(undefined);
      setEnd(undefined);
      setNotes("");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {room.price} {room.currency}
            </span>
          </div>
          {room.description && (
            <p className="mt-1 text-xs text-muted-foreground">{room.description}</p>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit room">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete room">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {bookings.length > 0 && (
        <div className="mt-2 space-y-1">
          {bookings.map((b) => {
            const isMine = b.user_id === currentUserId;
            const name = b.username || "anon";
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={b.avatar_url || getBestAvatar(name, null, 40)} alt={name} />
                    <AvatarFallback className="text-[8px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-muted-foreground">
                    <Lock className="mr-1 inline h-3 w-3" />
                    {format(parseISO(b.start_date), "MMM d")} – {format(parseISO(b.end_date), "MMM d")}
                    {isMine && <span className="ml-1 font-semibold text-foreground">(you)</span>}
                  </span>
                </div>
                {(isMine || canManage) && (
                  <button onClick={() => onCancelBooking(b.id)} className="text-muted-foreground hover:text-destructive" aria-label="Cancel booking">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showBook ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 w-full"
          onClick={() => setShowBook(true)}
          disabled={!currentUserId}
          title={!currentUserId ? "Sign in to book" : undefined}
        >
          <Lock className="h-3 w-3" />
          Book this room
        </Button>
      ) : (
        <div className="mt-2 space-y-2 rounded border border-border bg-muted/30 p-2">
          <div className="grid grid-cols-2 gap-2">
            <DateField label="Check-in" date={start} setDate={setStart} disabled={isBookedDay} />
            <DateField label="Check-out" date={end} setDate={setEnd} disabled={isBookedDay} />
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowBook(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7" onClick={submit} disabled={!start || !end || busy}>
              Confirm booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const DateField = ({
  label,
  date,
  setDate,
  disabled,
}: {
  label: string;
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  disabled: (d: Date) => boolean;
}) => (
  <div>
    <Label className="text-[10px] text-muted-foreground">{label}</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 w-full justify-start text-left text-xs font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="h-3 w-3" />
          {date ? format(date, "MMM d, yyyy") : "Pick"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || disabled(d)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  </div>
);
