import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { statusLabel } from './format.js';
import { AppointmentModal } from './components/AppointmentModal.jsx';
import { Appointments } from './components/Appointments.jsx';
import { DoctorModal } from './components/DoctorModal.jsx';
import { Doctors } from './components/Doctors.jsx';
import { Overview } from './components/Overview.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { IconAlert, IconRefresh } from './components/Icons.jsx';
import { EmptyState, ErrorBanner, Spinner, Toast } from './components/ui.jsx';

const VIEWS = {
  overview: 'Overview',
  appointments: 'Appointments',
  doctors: 'Doctors',
};
const HEALTH_INTERVAL_MS = 15000;

const viewFromHash = (fallback) => {
  const { hash } = window.location;
  if (!hash.startsWith('#/')) return fallback;
  const view = hash.slice(2);
  return view in VIEWS ? view : 'overview';
};

const asList = (value) => (Array.isArray(value) ? value : []);

export const App = () => {
  const [view, setView] = useState(() => viewFromHash('overview'));
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [health, setHealth] = useState({ state: 'checking', version: null });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const onHashChange = () => setView((current) => viewFromHash(current));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${VIEWS[view]} · ClinicDesk`;
  }, [view]);

  const notify = useCallback((message, tone = 'success') => setToast({ message, tone, id: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    const [doctorsResult, appointmentsResult, statsResult] = await Promise.allSettled([
      api.listDoctors(),
      api.listAppointments(),
      api.getStats(),
    ]);
    if (requestId !== requestRef.current) return;

    if (doctorsResult.status === 'fulfilled') setDoctors(asList(doctorsResult.value));
    if (appointmentsResult.status === 'fulfilled') setAppointments(asList(appointmentsResult.value));
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (doctorsResult.status === 'fulfilled' && appointmentsResult.status === 'fulfilled') setHasData(true);

    const failure = [doctorsResult, appointmentsResult, statsResult].find((result) => result.status === 'rejected');
    setLoadError(failure ? failure.reason : null);
    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const result = await api.health();
        if (cancelled) return;
        setHealth({ state: result?.status === 'ok' ? 'online' : 'degraded', version: result?.version ?? null });
      } catch {
        if (!cancelled) setHealth((current) => ({ ...current, state: 'offline' }));
      }
    };
    check();
    const timer = setInterval(check, HEALTH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // When the API comes back after an outage, reload data automatically.
  const previousHealth = useRef(health.state);
  useEffect(() => {
    const wasDown = previousHealth.current === 'offline';
    previousHealth.current = health.state;
    if (wasDown && health.state === 'online' && loadError) refresh();
  }, [health.state, loadError, refresh]);

  const changeStatus = useCallback(
    async (appointment, status) => {
      setBusyId(appointment.id);
      try {
        await api.updateAppointment(appointment.id, { status });
        notify(`${appointment.patient_name}: ${statusLabel(status).toLowerCase()}`);
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        setBusyId(null);
        await refresh();
      }
    },
    [notify, refresh],
  );

  const deleteAppointment = useCallback(
    async (appointment) => {
      await api.deleteAppointment(appointment.id);
      notify(`Deleted ${appointment.patient_name}’s appointment`);
      await refresh();
    },
    [notify, refresh],
  );

  const deleteDoctor = useCallback(
    async (doctor) => {
      await api.deleteDoctor(doctor.id);
      notify(`${doctor.full_name} removed`);
      await refresh();
    },
    [notify, refresh],
  );

  const createAppointment = async (payload) => {
    await api.createAppointment(payload);
    setModal(null);
    notify(`Appointment booked for ${payload.patient_name}`);
    await refresh();
  };

  const createDoctor = async (payload) => {
    const doctor = await api.createDoctor(payload);
    setModal(null);
    notify(`${doctor?.full_name ?? payload.full_name} added to the roster`);
    await refresh();
  };

  const openNewAppointment = () => setModal({ type: 'appointment' });

  const counts = hasData ? { appointments: appointments.length, doctors: doctors.length } : {};
  const unavailable = loaded && !hasData && loadError;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar view={view} health={health} counts={counts} />

      <main id="main" className="main" tabIndex={-1}>
        <div className="main-inner">
          {loadError && <ErrorBanner error={loadError} onRetry={refresh} retrying={loading} stale={hasData} />}

          {unavailable && (
            <section className="card">
              <EmptyState
                icon={<IconAlert width={24} height={24} />}
                title="Clinic data is unavailable"
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={refresh} disabled={loading}>
                    {loading ? <Spinner /> : <IconRefresh width={16} height={16} />}
                    Try again
                  </button>
                }
              >
                The dashboard will fill in as soon as the ClinicDesk API responds. The status pill in the sidebar
                turns green when it is back.
              </EmptyState>
            </section>
          )}

          {!unavailable && view === 'overview' && (
            <Overview
              stats={stats}
              appointments={appointments}
              loaded={loaded}
              loading={loading}
              onNew={openNewAppointment}
              onRefresh={refresh}
              onStatusChange={changeStatus}
              busyId={busyId}
            />
          )}
          {!unavailable && view === 'appointments' && (
            <Appointments
              appointments={appointments}
              doctors={doctors}
              loaded={loaded}
              loading={loading}
              onNew={openNewAppointment}
              onRefresh={refresh}
              onStatusChange={changeStatus}
              onDelete={deleteAppointment}
              busyId={busyId}
            />
          )}
          {!unavailable && view === 'doctors' && (
            <Doctors
              doctors={doctors}
              stats={stats}
              appointments={appointments}
              loaded={loaded}
              onAdd={() => setModal({ type: 'doctor' })}
              onBook={(doctor) => setModal({ type: 'appointment', doctorId: doctor.id })}
              onDelete={deleteDoctor}
            />
          )}
        </div>
      </main>

      {modal?.type === 'appointment' && (
        <AppointmentModal
          doctors={doctors}
          defaultDoctorId={modal.doctorId}
          onSubmit={createAppointment}
          onClose={() => setModal(null)}
          onAddDoctor={() => setModal({ type: 'doctor' })}
        />
      )}
      {modal?.type === 'doctor' && <DoctorModal onSubmit={createDoctor} onClose={() => setModal(null)} />}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
};
