const spotsList = document.querySelector('#spots-list');
const spotsMessage = document.querySelector('#spots-message');
const spotSelect = document.querySelector('#parking-spot');
const agendaDate = document.querySelector('#agenda-date');
const agendaName = document.querySelector('#agenda-spot-name');
const agendaTimeline = document.querySelector('#agenda-timeline');
const agendaMessage = document.querySelector('#agenda-message');
const reservationForm = document.querySelector('#reservation-form');
const reservationMessage = document.querySelector('#reservation-message');
const formError = document.querySelector('#form-error');
const reserveButton = document.querySelector('#reserve-button');
const startInput = document.querySelector('#start-time');
const endInput = document.querySelector('#end-time');
const reservationsList = document.querySelector('#reservations-list');
const reservationsMessage = document.querySelector('#reservations-message');

let spots = [];
let reservations = [];
let reservationsLoaded = false;
let reservationsFailed = false;

const pad = (number) => String(number).padStart(2, '0');
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localDateTime = (date) => `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });
const spotTypes = { STANDARD: 'Estándar', ELECTRIC: 'Eléctrico', ACCESSIBLE: 'Accesible' };

function setMessage(element, message, kind = '') {
  element.textContent = message;
  element.className = `message ${kind}`.trim();
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function defaultPeriod(day = new Date()) {
  const today = localDate(new Date());
  const start = localDate(day) === today
    ? new Date(Math.ceil(Date.now() / 3600000) * 3600000)
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9);
  const end = new Date(start.getTime() + 3600000);
  startInput.value = localDateTime(start);
  endInput.value = localDateTime(end);
  agendaDate.value = localDate(start);
}

function selectSpot(id, scrollToForm = false) {
  selectedSpotId = id;
  spotSelect.value = id;
  renderSpots();
  renderAgenda();
  if (scrollToForm) {
    document.querySelector('.booking-section').scrollIntoView({ behavior: 'smooth' });
    startInput.focus({ preventScroll: true });
  }
}

function renderSpots() {
  spotsList.replaceChildren();
  spotSelect.replaceChildren();

  if (spots.length === 0) {
    setMessage(spotsMessage, 'No hay espacios disponibles por ahora.');
    agendaName.textContent = 'Selecciona un espacio';
    renderAgenda();
    return;
  }

  setMessage(spotsMessage, '');
  for (const spot of spots) {
    const type = spotTypes[spot.type] ?? spot.type;
    const option = makeElement('option', '', `${spot.number}, zona ${spot.zone}, ${type}`);
    option.value = spot.id;
    spotSelect.append(option);

    const card = makeElement('button', `spot-card${spot.id === selectedSpotId ? ' selected' : ''}`);
    card.type = 'button';
    card.setAttribute('aria-pressed', String(spot.id === selectedSpotId));
    card.setAttribute('aria-label', `${spot.number}, zona ${spot.zone}, ${type}, ${spot.available ? 'disponible ahora' : 'ocupado ahora'}. Ver agenda`);

    const top = makeElement('span', 'spot-card-top');
    top.append(makeElement('span', 'spot-icon', spot.zone), makeElement('span', `status-dot${spot.available ? '' : ' busy'}`));
    card.append(top,
      makeElement('span', 'spot-number', spot.number),
      makeElement('span', 'spot-meta', `Zona ${spot.zone} - ${type}`),
      makeElement('span', `spot-status${spot.available ? '' : ' busy'}`, spot.available ? 'Disponible ahora' : 'Ocupado ahora'));
    card.addEventListener('click', () => selectSpot(spot.id, true));
    spotsList.append(card);
  }
  spotSelect.value = selectedSpotId;
}

let selectedSpotId = '';

async function loadSpots() {
  setMessage(spotsMessage, 'Cargando espacios...');
  try {
    const response = await fetch('/api/spots');
    if (!response.ok) throw new Error('Could not load spots');
    spots = await response.json();
    if (!spots.some((spot) => spot.id === selectedSpotId)) selectedSpotId = spots[0]?.id ?? '';
    renderSpots();
    renderAgenda();
  } catch (error) {
    console.error(error);
    spots = [];
    spotsList.replaceChildren();
    spotSelect.replaceChildren();
    setMessage(spotsMessage, 'No se pudieron cargar los espacios. Intenta actualizar.', 'error');
    renderAgenda();
  }
}

function renderAgenda() {
  agendaTimeline.replaceChildren();
  const spot = spots.find((item) => item.id === selectedSpotId);
  agendaName.textContent = spot ? `Espacio ${spot.number} - Zona ${spot.zone}` : 'Selecciona un espacio';
  if (!spot || !agendaDate.value) {
    setMessage(agendaMessage, 'Elige un espacio y una fecha.');
    return;
  }
  if (!reservationsLoaded) {
    setMessage(agendaMessage, reservationsFailed ? 'No se pudieron cargar los horarios.' : 'Cargando horarios...', reservationsFailed ? 'error' : '');
    return;
  }

  const [year, month, day] = agendaDate.value.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day);
  const dayEnd = new Date(year, month - 1, day + 1);
  if (Number.isNaN(dayStart.getTime())) return;
  const dayMs = dayEnd.getTime() - dayStart.getTime();

  for (let hour = 0; hour < 24; hour += 1) {
    const label = makeElement('span', 'agenda-hour', `${pad(hour)}:00`);
    label.style.top = `${(hour / 24) * 100}%`;
    agendaTimeline.append(label);
  }

  const busy = reservations.filter((reservation) =>
    reservation.status === 'ACTIVE' &&
    String(reservation.parkingSpotId?._id ?? reservation.parkingSpotId) === selectedSpotId &&
    new Date(reservation.startTime) < dayEnd &&
    new Date(reservation.endTime) > dayStart
  );

  setMessage(agendaMessage, busy.length ? `${busy.length} horario${busy.length === 1 ? '' : 's'} ocupado${busy.length === 1 ? '' : 's'} este día.` : 'Todo el día libre para este espacio.', busy.length ? '' : 'success');
  for (const reservation of busy) {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const clippedStart = Math.max(start.getTime(), dayStart.getTime());
    const clippedEnd = Math.min(end.getTime(), dayEnd.getTime());
    const block = makeElement('div', 'agenda-block');
    block.style.top = `${((clippedStart - dayStart.getTime()) / dayMs) * 100}%`;
    block.style.height = `${((clippedEnd - clippedStart) / dayMs) * 100}%`;
    const label = `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
    block.textContent = `Ocupado: ${label}`;
    block.setAttribute('aria-label', `Ocupado de ${label}`);
    block.title = `Ocupado de ${label}`;
    agendaTimeline.append(block);
  }
}

async function loadReservations() {
  reservationsLoaded = false;
  reservationsFailed = false;
  setMessage(reservationsMessage, 'Cargando reservaciones...');
  renderAgenda();
  try {
    const response = await fetch('/api/reservations');
    if (!response.ok) throw new Error('Could not load reservations');
    reservations = await response.json();
    reservationsLoaded = true;
    renderReservations();
    renderAgenda();
  } catch (error) {
    console.error(error);
    reservationsFailed = true;
    setMessage(reservationsMessage, 'No se pudieron cargar las reservaciones.', 'error');
    renderAgenda();
  }
}

function renderReservations() {
  reservationsList.replaceChildren();
  setMessage(reservationsMessage, reservations.length ? '' : 'Todavía no hay reservaciones.');
  const ordered = [...reservations].sort((a, b) => (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1));

  for (const reservation of ordered) {
    const isActive = reservation.status === 'ACTIVE';
    const isCurrent = isActive && new Date(reservation.endTime) > new Date();
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const number = reservation.parkingSpotId?.number ?? 'Espacio eliminado';
    const card = makeElement('article', `reservation-card${isActive ? '' : ' cancelled'}`);
    card.append(makeElement('div', 'reservation-symbol', number[0]));

    const details = makeElement('div', 'reservation-details');
    details.append(makeElement('h3', '', `Espacio ${number}`));
    const sameDay = localDate(start) === localDate(end);
    details.append(makeElement('p', '', sameDay
      ? `${dateFormatter.format(start)}, ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
      : `${dateFormatter.format(start)} ${timeFormatter.format(start)} – ${dateFormatter.format(end)} ${timeFormatter.format(end)}`));
    details.append(makeElement('span', `reservation-state${isActive ? '' : ' cancelled'}`, isActive ? (isCurrent ? 'ACTIVA' : 'FINALIZADA') : 'CANCELADA'));
    card.append(details);

    if (isCurrent) {
      const actions = makeElement('div', 'reservation-actions');
      const extendButton = makeElement('button', 'button button-secondary', 'Extender');
      extendButton.type = 'button';
      extendButton.setAttribute('aria-expanded', 'false');
      extendButton.setAttribute('aria-label', `Extender la reservación del espacio ${number}`);
      extendButton.addEventListener('click', () => {
        const openForm = card.querySelector('.extend-form');
        if (openForm) {
          openForm.remove();
          extendButton.setAttribute('aria-expanded', 'false');
          extendButton.textContent = 'Extender';
          return;
        }
        const form = createExtendForm(reservation);
        card.append(form);
        extendButton.setAttribute('aria-expanded', 'true');
        extendButton.textContent = 'Cerrar';
        form.querySelector('input').focus();
      });
      actions.append(extendButton);
      const cancelButton = makeElement('button', 'button button-danger', 'Cancelar');
      cancelButton.type = 'button';
      cancelButton.addEventListener('click', () => {
        if (cancelButton.dataset.confirm !== 'true') {
          cancelButton.dataset.confirm = 'true';
          cancelButton.textContent = 'Confirmar cancelación';
          cancelButton.setAttribute('aria-label', `Confirmar cancelación del espacio ${number}`);
          return;
        }
        cancelReservation(reservation._id, cancelButton);
      });
      actions.append(cancelButton);
      card.append(actions);
    }
    reservationsList.append(card);
  }
}

const extendErrorMessages = {
  400: 'La nueva hora final debe ser una fecha válida y posterior a la hora final actual.',
  404: 'La reservación ya no existe. Actualiza la lista.',
  409: 'La reservación ya no puede extenderse porque ya no está activa o vigente.'
};

function extendErrorText(status, serverMessage = '') {
  if (status === 409 && serverMessage.includes('not available')) {
    return 'El espacio ya está reservado en parte de ese horario. Elige una hora final más temprana.';
  }
  return extendErrorMessages[status] ?? 'No fue posible extender la reservación. Intenta de nuevo.';
}

function createExtendForm(reservation) {
  const form = makeElement('form', 'extend-form');
  const label = makeElement('label', '', 'Nueva hora final');
  const input = makeElement('input');
  input.type = 'datetime-local';
  input.required = true;
  const currentEnd = new Date(reservation.endTime);
  input.min = localDateTime(currentEnd);
  input.value = localDateTime(new Date(currentEnd.getTime() + 3600000));
  label.append(input);
  const button = makeElement('button', 'button button-primary', 'Guardar extensión');
  button.type = 'submit';
  const message = makeElement('p', 'extend-message');
  message.setAttribute('role', 'alert');
  form.append(label, button, message);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    const newEnd = new Date(input.value);
    if (!input.value || Number.isNaN(newEnd.getTime())) {
      message.textContent = 'Captura una fecha y hora válidas.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Guardando...';
    try {
      const response = await fetch(`/api/reservations/${reservation._id}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endTime: newEnd.toISOString() })
      });
      // fetch no rechaza la Promise con 4xx/5xx: se revisa response.ok.
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        message.textContent = extendErrorText(response.status, body.message);
        return;
      }

      const updated = await response.json();
      await Promise.all([loadReservations(), loadSpots()]);
      setMessage(reservationsMessage,
        `Reservación extendida correctamente. Nueva hora final: ${timeFormatter.format(new Date(updated.endTime))}`,
        'success');
    } catch (error) {
      console.error(error);
      message.textContent = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      if (form.isConnected) {
        button.disabled = false;
        button.textContent = 'Guardar extensión';
      }
    }
  });
  return form;
}

async function createReservation(event) {
  event.preventDefault();
  formError.textContent = '';
  setMessage(reservationMessage, '');
  const start = new Date(startInput.value);
  const end = new Date(endInput.value);
  if (!selectedSpotId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    formError.textContent = 'Elige un espacio y un horario con el inicio antes del fin.';
    return;
  }
  if (start < new Date()) {
    formError.textContent = 'El inicio debe ser una fecha y hora futuras.';
    return;
  }

  reserveButton.disabled = true;
  reserveButton.textContent = 'Confirmando...';
  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parkingSpotId: selectedSpotId, startTime: start.toISOString(), endTime: end.toISOString() })
    });
    if (response.status === 409) {
      setMessage(reservationMessage, 'Ese espacio ya está reservado en ese horario.', 'error');
      return;
    }
    if (!response.ok) throw new Error('Could not create reservation');
    await Promise.all([loadReservations(), loadSpots()]);
    setMessage(reservationMessage, 'Reservación creada correctamente.', 'success');
    document.querySelector('#reservaciones').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    setMessage(reservationMessage, 'No fue posible crear la reservación.', 'error');
  } finally {
    reserveButton.disabled = false;
    reserveButton.textContent = 'Confirmar reservación';
  }
}

async function cancelReservation(id, button) {
  button.disabled = true;
  button.textContent = 'Cancelando...';
  try {
    const response = await fetch(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
    if (!response.ok) throw new Error('Could not cancel reservation');
    await Promise.all([loadReservations(), loadSpots()]);
    setMessage(reservationsMessage, 'Reservación cancelada correctamente.', 'success');
  } catch (error) {
    console.error(error);
    setMessage(reservationsMessage, 'No fue posible cancelar la reservación.', 'error');
    button.disabled = false;
    button.textContent = 'Cancelar';
  }
}

document.querySelector('#refresh-button').addEventListener('click', async () => {
  await Promise.all([loadSpots(), loadReservations()]);
});
spotSelect.addEventListener('change', () => {
  selectedSpotId = spotSelect.value;
  renderSpots();
  renderAgenda();
});
agendaDate.addEventListener('change', () => {
  if (agendaDate.value) {
    const [year, month, day] = agendaDate.value.split('-').map(Number);
    const chosen = new Date(year, month - 1, day);
    defaultPeriod(chosen);
  }
  renderAgenda();
});
startInput.addEventListener('change', () => {
  if (startInput.value) {
    agendaDate.value = startInput.value.slice(0, 10);
    renderAgenda();
  }
});
reservationForm.addEventListener('submit', createReservation);
defaultPeriod();
Promise.all([loadSpots(), loadReservations()]);
