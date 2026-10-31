const STORAGE_KEY = "todo-app-tasks";
const SVG_NS = "http://www.w3.org/2000/svg";

// 1. Page elements
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const errorMessage = document.getElementById("error-message");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const countNumber = document.getElementById("count-number");
const countLabel = document.getElementById("count-label");
const filterButtons = document.querySelectorAll(".filter-btn");
const clearButton = document.getElementById("clear-completed");
const dateLine = document.getElementById("today-date");

// 2. State: an array of { id, text, completed } and the current filter
let tasks = loadTasks();
let currentFilter = "all";
let renderTimer = null;

// Show today's date under the title.
dateLine.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long"
});

// ---------- Saving and loading (localStorage) ----------

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      // Keep only well-formed entries, in case the stored data was edited.
      return saved
        .filter((t) => t && typeof t.id === "string" && typeof t.text === "string")
        .map((t) => ({ id: t.id, text: t.text, completed: Boolean(t.completed) }));
    }
  } catch (error) {
    // Storage blocked or data corrupted: start with an empty list.
  }
  return [];
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    // Storage full or blocked: the app still works, it just won't persist.
  }
}

// ---------- Actions ----------

function showError(message) {
  errorMessage.textContent = message;
  input.classList.add("invalid");
}

function clearError() {
  errorMessage.textContent = "";
  input.classList.remove("invalid");
}

function addTask(text) {
  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: text,
    completed: false
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();

  // Update the row in place so the pen tick can animate.
  const task = tasks.find((t) => t.id === id);
  const row = taskList.querySelector('[data-id="' + id + '"]');
  if (row && task) {
    row.classList.toggle("completed", task.completed);
  }
  updateCounts();

  // In the Active or Completed views the row should leave once the tick is drawn.
  if (currentFilter !== "all") {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 450);
  }
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
}

// ---------- Drawing the page ----------

function getVisibleTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }
  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

// The counter and the "Clear completed" button depend only on the task data.
function updateCounts() {
  const remaining = tasks.filter((task) => !task.completed).length;
  countNumber.textContent = remaining;
  countLabel.textContent = remaining === 1 ? "task left" : "tasks left";
  clearButton.disabled = !tasks.some((task) => task.completed);
}

// Build the checkbox plus the pen-drawn tick that sits on top of it.
function createCheck(task) {
  const wrapper = document.createElement("span");
  wrapper.className = "check";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "task-" + task.id;
  checkbox.checked = task.completed;

  const tick = document.createElementNS(SVG_NS, "svg");
  tick.setAttribute("class", "tick");
  tick.setAttribute("viewBox", "0 0 30 30");
  tick.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M6 16 L12 23 L28 3");
  path.setAttribute("pathLength", "1");
  tick.appendChild(path);

  wrapper.append(checkbox, tick);
  return wrapper;
}

function render() {
  clearTimeout(renderTimer);
  taskList.innerHTML = "";

  const visible = getVisibleTasks();

  // Build one <li> for each visible task.
  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.completed ? " completed" : "");
    li.dataset.id = task.id;

    const label = document.createElement("label");
    label.htmlFor = "task-" + task.id;
    label.textContent = task.text; // textContent keeps user input safe

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "×"; // the × sign
    deleteBtn.setAttribute("aria-label", "Delete task: " + task.text);

    li.append(createCheck(task), label, deleteBtn);
    taskList.appendChild(li);
  });

  // A clear next step when there is nothing to show.
  if (visible.length === 0) {
    if (tasks.length === 0) {
      emptyMessage.textContent = "No tasks yet. Add your first one above.";
    } else if (currentFilter === "active") {
      emptyMessage.textContent = "Nothing left to do. Nice work!";
    } else if (currentFilter === "completed") {
      emptyMessage.textContent = "No completed tasks yet.";
    } else {
      emptyMessage.textContent = "";
    }
  } else {
    emptyMessage.textContent = "";
  }

  // Highlight the active filter button.
  filterButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === currentFilter));
  });

  updateCounts();
}

// ---------- Events ----------

// Add task (the button click and the Enter key both submit the form).
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (text === "") {
    showError("Type a task before adding it.");
    input.focus();
    return;
  }

  clearError();
  addTask(text);
  input.value = "";
  input.focus();
});

// Remove the error as soon as the person starts typing again.
input.addEventListener("input", clearError);

// One listener on the list handles every checkbox and delete button.
taskList.addEventListener("change", (event) => {
  if (event.target.matches('input[type="checkbox"]')) {
    toggleTask(event.target.closest(".task").dataset.id);
  }
});

taskList.addEventListener("click", (event) => {
  if (event.target.matches(".delete-btn")) {
    deleteTask(event.target.closest(".task").dataset.id);
  }
});

// Filter buttons
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

clearButton.addEventListener("click", clearCompleted);

// Draw the saved tasks when the page loads.
render();
