import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useDatabase } from "@/shared/services/DatabaseContext";
import { useDeals } from "@/features/deals/hooks/useDeals";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import CalendarHeader from "../components/CalendarHeader";
import MonthViewGrid from "../components/MonthViewGrid";
import WeekViewGrid from "../components/WeekViewGrid";
import AgendaViewList from "../components/AgendaViewList";
import EventDetailsModal from "../components/EventDetailsModal";
import { CalendarViewMode, CalendarEvent } from "../types";
import { User, Lead } from "@/shared/types";
import { useAppShell } from "@/shared/layouts/AppShellContext";

interface CalendarPageProps {
  user: User;
}

export default function CalendarPage({ user: _user }: CalendarPageProps) {
  const navigate = useNavigate();
  const { openCallLogModal } = useAppShell();
  const { leads } = useDatabase();
  const { updateLead } = useLeadsStore();
  const { deals } = useDeals();
  const { projects } = useProjectsStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const { filteredEvents, eventsByDate } = useCalendarEvents({
    leads: leads || [],
    deals: deals || [],
    projects: projects || {},
    selectedEventType,
    selectedProjectId,
    searchQuery,
  });

  const handlePrevDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(prev.getMonth() - 1);
      else if (viewMode === "week") next.setDate(prev.getDate() - 7);
      else next.setDate(prev.getDate() - 1);
      return next;
    });
  };

  const handleNextDate = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") next.setMonth(prev.getMonth() + 1);
      else if (viewMode === "week") next.setDate(prev.getDate() + 7);
      else next.setDate(prev.getDate() + 1);
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleStartCall = useCallback(
    (phone: string, name: string) => {
      const targetLead = leads.find((l: Lead) => l.phone === phone || l.name === name);
      if (targetLead) {
        openCallLogModal(targetLead);
      }
    },
    [leads, openCallLogModal]
  );

  const handleRescheduleDate = useCallback(
    async (leadId: string, newDateYmd: string) => {
      await updateLead(leadId, { followUpDate: newDateYmd });
    },
    [updateLead]
  );

  return (
    <div className="h-full min-h-0 flex flex-col flex-1 overflow-hidden space-y-3 animate-fadeIn p-2 sm:p-3 md:p-4 w-full max-w-none">
      {/* Calendar Navigation & Filter Toolbar */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrevDate={handlePrevDate}
        onNextDate={handleNextDate}
        onToday={handleToday}
        selectedEventType={selectedEventType}
        onEventTypeChange={setSelectedEventType}
        selectedProjectId={selectedProjectId}
        onProjectIdChange={setSelectedProjectId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        projects={projects || {}}
      />

      {/* Main View Surface */}
      {viewMode === "month" && (
        <MonthViewGrid
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          onSelectEvent={(evt) => setActiveEvent(evt)}
          onSelectDay={(dateYmd) => {
            const [y, m, d] = dateYmd.split("-").map(Number);
            setCurrentDate(new Date(y, m - 1, d));
            setViewMode("day");
          }}
        />
      )}

      {viewMode === "week" && (
        <WeekViewGrid
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          isDayOnly={false}
          onSelectEvent={(evt) => setActiveEvent(evt)}
        />
      )}

      {viewMode === "day" && (
        <WeekViewGrid
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          isDayOnly={true}
          onSelectEvent={(evt) => setActiveEvent(evt)}
        />
      )}

      {viewMode === "agenda" && (
        <AgendaViewList
          filteredEvents={filteredEvents}
          onSelectEvent={(evt) => setActiveEvent(evt)}
          onStartCall={handleStartCall}
          navigate={navigate}
        />
      )}

      {/* Event Details & Reschedule Modal */}
      <EventDetailsModal
        event={activeEvent}
        onClose={() => setActiveEvent(null)}
        onStartCall={handleStartCall}
        onRescheduleDate={handleRescheduleDate}
        navigate={navigate}
      />
    </div>
  );
}
