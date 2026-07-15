(() => {
  "use strict";

  const dayNumber = document.querySelector("#dayNumber");
  const monthName = document.querySelector("#monthName");
  const year = document.querySelector("#year");
  const weekday = document.querySelector("#weekday");
  const days = document.querySelector("#days");
  const previousMonth = document.querySelector("#previousMonth");
  const nextMonth = document.querySelector("#nextMonth");
  const todayButton = document.querySelector("#todayButton");

  const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  const spokenFormatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const now = startOfDay(new Date());
  let selected = new Date(now);
  let visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function sameDay(left, right) {
    return left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function renderSummary() {
    dayNumber.textContent = selected.getDate();
    dayNumber.dateTime = selected.toISOString().slice(0, 10);
    monthName.textContent = monthFormatter.format(selected);
    year.textContent = selected.getFullYear();
    weekday.textContent = capitalize(weekdayFormatter.format(selected).replace(".", ""));
  }

  function renderCalendar() {
    days.replaceChildren();

    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - mondayOffset);

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      const button = document.createElement("button");
      const label = document.createElement("span");
      const isOutside = date.getMonth() !== visibleMonth.getMonth();

      button.type = "button";
      button.className = "day";
      button.setAttribute("role", "gridcell");
      button.dataset.date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      button.title = spokenFormatter.format(date);

      if (date < now && !isOutside) button.classList.add("past");
      if (sameDay(date, now)) {
        button.classList.add("today");
        button.setAttribute("aria-current", "date");
      }
      if (sameDay(date, selected)) button.classList.add("selected");
      if (isOutside) button.classList.add("outside");

      label.className = "day-label";
      label.textContent = spokenFormatter.format(date);
      button.append(label);
      button.addEventListener("click", () => selectDate(date));
      days.append(button);
    }

    const visibleLabel = capitalize(monthFormatter.format(visibleMonth));
    days.setAttribute("aria-label", `${visibleLabel} ${visibleMonth.getFullYear()}`);
  }

  function selectDate(date) {
    selected = startOfDay(date);
    visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    render();
  }

  function changeMonth(offset) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    selected = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    render();
  }

  function render() {
    renderSummary();
    renderCalendar();
    document.title = `${selected.getDate()} ${monthFormatter.format(selected)} · Calendrier`;
  }

  previousMonth.addEventListener("click", () => changeMonth(-1));
  nextMonth.addEventListener("click", () => changeMonth(1));
  todayButton.addEventListener("click", () => selectDate(now));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.target.closest(".day")) return;
    changeMonth(event.key === "ArrowLeft" ? -1 : 1);
  });

  render();
})();
