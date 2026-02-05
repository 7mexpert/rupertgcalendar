// RupertG Calendar - Main JavaScript Application
class RupertGCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.events = this.loadEvents();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
        this.updateSidebar();
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // Modal interactions
        document.getElementById('addEventBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') this.closeModal();
        });

        // Form submission
        document.getElementById('eventForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Color picker
        const colorInput = document.getElementById('eventColor');
        const colorPreview = document.getElementById('colorPreview');
        colorInput.addEventListener('input', (e) => {
            colorPreview.textContent = e.target.value;
            colorPreview.style.borderColor = e.target.value;
        });

        // Recurring events toggle
        const recurringCheckbox = document.getElementById('eventRecurring');
        const recurrenceOptions = document.getElementById('recurrenceOptions');
        const recurrenceEndOptions = document.getElementById('recurrenceEndOptions');
        
        recurringCheckbox.addEventListener('change', () => {
            if (recurringCheckbox.checked) {
                recurrenceOptions.style.display = 'block';
                recurrenceEndOptions.style.display = 'block';
            } else {
                recurrenceOptions.style.display = 'none';
                recurrenceEndOptions.style.display = 'none';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.key === 'Enter' && e.ctrlKey) this.openModal();
        });
    }

    // Calendar rendering
    render() {
        this.updateMonthDisplay();
        this.renderCalendarGrid();
    }

    updateMonthDisplay() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('currentMonth').textContent = monthNames[this.currentDate.getMonth()];
        document.getElementById('currentYear').textContent = this.currentDate.getFullYear();
    }

    renderCalendarGrid() {
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';
        
        // Add weekday headers
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // Get first day of month and total days
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        const startDay = firstDay.getDay();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell other-month';
            calendarGrid.appendChild(emptyCell);
        }

        // Add day cells for the current month
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            dayCell.innerHTML = `<div class="day-number">${day}</div><div class="events-preview"></div>`;
            
            // Set data attributes for event handling
            const dateKey = this.getDateKey(year, month, day);
            dayCell.dataset.date = dateKey;
            
            // Check if this is today
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayCell.classList.add('today');
            }

        // Add events to the cell
        const dayEvents = this.getEventsForDate(dateKey);
        if (dayEvents.length > 0) {
            dayCell.classList.add('has-events');
            this.renderEventsPreview(dayCell, dayEvents);
            
            // Add event count indicator
            const eventCount = document.createElement('div');
            eventCount.className = 'event-indicator';
            eventCount.textContent = dayEvents.length;
            dayCell.appendChild(eventCount);
        }

            // Event listeners
            dayCell.addEventListener('click', () => this.selectDay(dayCell, dateKey));
            dayCell.addEventListener('dblclick', () => this.openModal(dateKey));

            calendarGrid.appendChild(dayCell);
        }
    }

    renderEventsPreview(dayCell, events) {
        const previewContainer = dayCell.querySelector('.events-preview');
        previewContainer.innerHTML = '';
        
        // Show up to 3 event dots
        const maxDots = 3;
        const eventsToShow = events.slice(0, maxDots);
        
        eventsToShow.forEach(event => {
            const dot = document.createElement('div');
            dot.className = 'event-dot';
            dot.style.backgroundColor = event.color || '#3b82f6';
            previewContainer.appendChild(dot);
        });

        // Add "+X more" if there are more events
        if (events.length > maxDots) {
            const more = document.createElement('div');
            more.className = 'event-dot';
            more.style.backgroundColor = '#94a3b8';
            more.style.width = '6px';
            more.style.height = '6px';
            more.style.alignSelf = 'center';
            previewContainer.appendChild(more);
        }
    }

    getEventsForDate(dateKey) {
        const events = this.events[dateKey] || [];
        const date = this.parseDateKey(dateKey);
        
        // Check for recurring events
        const recurringEvents = this.getRecurringEventsForDate(date);
        
        return [...events, ...recurringEvents];
    }

    getRecurringEventsForDate(date) {
        const recurringEvents = [];
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        const dayOfWeek = date.getDay();
        
        // Check all stored events for recurring patterns
        Object.keys(this.events).forEach(key => {
            const dayEvents = this.events[key];
            dayEvents.forEach(event => {
                if (event.recurrence) {
                    const shouldInclude = this.checkRecurrence(event.recurrence, date, dayOfWeek, month, year);
                    if (shouldInclude) {
                        recurringEvents.push({
                            ...event,
                            isRecurring: true,
                            originalDate: key
                        });
                    }
                }
            });
        });
        
        return recurringEvents;
    }

    checkRecurrence(recurrence, date, dayOfWeek, month, year) {
        const eventDate = new Date(recurrence.startDate);
        const eventDayOfWeek = eventDate.getDay();
        const eventDayOfMonth = eventDate.getDate();
        const eventMonth = eventDate.getMonth();
        const eventYear = eventDate.getFullYear();

        switch (recurrence.type) {
            case 'daily':
                return date >= eventDate;
            
            case 'weekly':
                return date >= eventDate && dayOfWeek === eventDayOfWeek;
            
            case 'monthly':
                return date >= eventDate && day === eventDayOfMonth;
            
            case 'yearly':
                return date >= eventDate && day === eventDayOfMonth && month === eventMonth;
            
            case 'weekdays':
                return date >= eventDate && dayOfWeek >= 1 && dayOfWeek <= 5;
            
            case 'weekends':
                return date >= eventDate && (dayOfWeek === 0 || dayOfWeek === 6);
            
            default:
                return false;
        }
    }

    // Event management
    selectDay(dayCell, dateKey) {
        // Remove previous selection
        document.querySelectorAll('.day-cell').forEach(cell => cell.style.outline = 'none');
        
        // Add selection outline
        dayCell.style.outline = '2px solid var(--primary-color)';
        
        // Update sidebar with events for selected day
        this.updateSidebar(dateKey);
    }

    updateSidebar(dateKey = null) {
        const eventsList = document.getElementById('eventsList');
        const selectedDate = dateKey ? this.parseDateKey(dateKey) : this.selectedDate;
        const dateKeyToUse = dateKey || this.getDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        
        const dayEvents = this.events[dateKeyToUse] || [];
        
        eventsList.innerHTML = '';
        
        if (dayEvents.length === 0) {
            const noEvents = document.createElement('div');
            noEvents.className = 'no-events';
            noEvents.textContent = 'No events scheduled for this day';
            eventsList.appendChild(noEvents);
            return;
        }

        // Sort events by time
        const sortedEvents = dayEvents.sort((a, b) => {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

        sortedEvents.forEach((event, index) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.style.borderLeftColor = event.color || '#3b82f6';
            
            const timeDisplay = event.time ? this.formatTime(event.time) : 'All day';
            const description = event.description ? `<div class="event-desc">${event.description}</div>` : '';
            
            eventItem.innerHTML = `
                <div class="event-time">${timeDisplay}</div>
                <div class="event-title">${event.title}</div>
                ${description}
            `;

            eventItem.addEventListener('click', () => this.openModal(dateKeyToUse, index));
            eventsList.appendChild(eventItem);
        });
    }

    openModal(dateKey = null, eventIndex = null) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const deleteBtn = document.getElementById('deleteEventBtn');
        const form = document.getElementById('eventForm');
        const recurringCheckbox = document.getElementById('eventRecurring');
        const recurrenceOptions = document.getElementById('recurrenceOptions');
        const recurrenceEndOptions = document.getElementById('recurrenceEndOptions');
        
        // Reset form
        form.reset();
        recurringCheckbox.checked = false;
        recurrenceOptions.style.display = 'none';
        recurrenceEndOptions.style.display = 'none';
        
        if (dateKey && eventIndex !== null) {
            // Editing existing event
            const event = this.events[dateKey][eventIndex];
            modalTitle.textContent = 'Edit Event';
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.onclick = () => this.deleteEvent(dateKey, eventIndex);
            
            // Populate form
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDate').value = dateKey;
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventColor').value = event.color || '#3b82f6';
            document.getElementById('colorPreview').textContent = event.color || '#3b82f6';
            
            // Handle recurring events
            if (event.recurrence) {
                recurringCheckbox.checked = true;
                recurrenceOptions.style.display = 'block';
                recurrenceEndOptions.style.display = 'block';
                document.getElementById('recurrenceType').value = event.recurrence.type;
                document.getElementById('recurrenceEndDate').value = event.recurrence.endDate || '';
            }
            
            // Store edit context
            form.dataset.editing = 'true';
            form.dataset.dateKey = dateKey;
            form.dataset.eventIndex = eventIndex;
        } else {
            // Adding new event
            modalTitle.textContent = 'Add Event';
            deleteBtn.style.display = 'none';
            
            // Set default date to selected date or today
            const defaultDate = dateKey || this.getDateKey(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate());
            document.getElementById('eventDate').value = defaultDate;
            document.getElementById('colorPreview').textContent = '#3b82f6';
            
            // Clear edit context
            delete form.dataset.editing;
            delete form.dataset.dateKey;
            delete form.dataset.eventIndex;
        }

        modal.classList.add('active');
        document.getElementById('eventTitle').focus();
    }

    closeModal() {
        document.getElementById('eventModal').classList.remove('active');
    }

    saveEvent() {
        const form = document.getElementById('eventForm');
        const title = document.getElementById('eventTitle').value.trim();
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const description = document.getElementById('eventDescription').value.trim();
        const color = document.getElementById('eventColor').value;
        const isRecurring = document.getElementById('eventRecurring').checked;
        const recurrenceType = document.getElementById('recurrenceType').value;
        const recurrenceEndDate = document.getElementById('recurrenceEndDate').value;

        if (!title || !date) {
            alert('Please enter a title and date for the event.');
            return;
        }

        const eventData = {
            title,
            time: time || null,
            description: description || null,
            color,
            createdAt: new Date().toISOString()
        };

        if (isRecurring) {
            eventData.recurrence = {
                type: recurrenceType,
                startDate: date,
                endDate: recurrenceEndDate || null
            };
        }

        if (form.dataset.editing === 'true') {
            // Update existing event
            const dateKey = form.dataset.dateKey;
            const eventIndex = parseInt(form.dataset.eventIndex);
            this.events[dateKey][eventIndex] = eventData;
        } else {
            // Add new event
            if (!this.events[date]) {
                this.events[date] = [];
            }
            this.events[date].push(eventData);
        }

        this.saveEvents();
        this.render();
        this.updateSidebar();
        this.closeModal();
        
        // Show success message
        this.showNotification('Event saved successfully!');
    }

    deleteEvent(dateKey, eventIndex) {
        if (confirm('Are you sure you want to delete this event?')) {
            const event = this.events[dateKey][eventIndex];
            
            if (event.recurrence) {
                // Ask if they want to delete just this instance or all recurring events
                const deleteAll = confirm('This is a recurring event. Delete all occurrences? (Cancel to delete only this instance)');
                
                if (deleteAll) {
                    // Delete all events with the same recurrence pattern
                    Object.keys(this.events).forEach(key => {
                        this.events[key] = this.events[key].filter(e => 
                            !(e.recurrence && e.recurrence.startDate === event.recurrence.startDate)
                        );
                        if (this.events[key].length === 0) {
                            delete this.events[key];
                        }
                    });
                } else {
                    // Delete only this instance by removing recurrence
                    event.recurrence = null;
                }
            } else {
                // Regular event deletion
                this.events[dateKey].splice(eventIndex, 1);
                if (this.events[dateKey].length === 0) {
                    delete this.events[dateKey];
                }
            }
            
            this.saveEvents();
            this.render();
            this.updateSidebar();
            this.closeModal();
            this.showNotification('Event deleted successfully!');
        }
    }

    // Navigation
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.render();
        this.updateSidebar();
    }

    // Utility functions
    getDateKey(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    parseDateKey(dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    formatTime(timeString) {
        if (!timeString) return 'All day';
        
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    // Storage management
    saveEvents() {
        localStorage.setItem('rupertg_calendar_events', JSON.stringify(this.events));
    }

    loadEvents() {
        const saved = localStorage.getItem('rupertg_calendar_events');
        return saved ? JSON.parse(saved) : {};
    }

    // Notifications
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '1001',
            transform: 'translateY(100px)',
            transition: 'transform 0.3s ease',
            fontSize: '0.9rem'
        });

        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
        }, 10);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RupertGCalendar();
});

// Auto-scroll function for mobile devices
function autoScrollToBottom() {
    // Check if we're on a mobile device
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Smooth scroll to the bottom of the page
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Add auto-scroll when clicking day cells on mobile
document.addEventListener('click', (e) => {
    if (e.target.closest('.day-cell')) {
        autoScrollToBottom();
    }
});
