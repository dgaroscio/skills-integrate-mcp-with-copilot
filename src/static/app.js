document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const loginPrompt = document.getElementById("login-prompt");
  const messageDiv = document.getElementById("message");
  
  // User menu elements
  const userBtn = document.getElementById("user-btn");
  const userMenu = document.getElementById("user-menu");
  const loginSection = document.getElementById("login-section");
  const logoutSection = document.getElementById("logout-section");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginUsernameInput = document.getElementById("login-username");
  const loginPasswordInput = document.getElementById("login-password");
  const loggedUser = document.getElementById("logged-user");

  let currentSessionId = null;
  let isTeacher = false;

  // Toggle user menu visibility
  userBtn.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  // Close user menu when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-section")) {
      userMenu.classList.add("hidden");
    }
  });

  // Handle login
  loginBtn.addEventListener("click", async () => {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    try {
      const response = await fetch("/login?username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password), {
        method: "POST"
      });

      const result = await response.json();

      if (response.ok) {
        currentSessionId = result.session_id;
        isTeacher = true;

        // Update UI
        loginSection.classList.add("hidden");
        logoutSection.classList.remove("hidden");
        loggedUser.textContent = result.username;
        signupContainer.classList.remove("hidden");
        loginPrompt.classList.add("hidden");

        // Clear inputs
        loginUsernameInput.value = "";
        loginPasswordInput.value = "";

        // Refresh activities to show delete buttons
        fetchActivities();
      } else {
        alert("Login failed: " + (result.detail || "Invalid credentials"));
      }
    } catch (error) {
      alert("Login error: " + error.message);
      console.error("Login error:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/logout?session_id=" + encodeURIComponent(currentSessionId), {
        method: "POST"
      });

      if (response.ok) {
        currentSessionId = null;
        isTeacher = false;

        // Update UI
        logoutSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
        signupContainer.classList.add("hidden");
        loginPrompt.classList.remove("hidden");

        // Refresh activities to hide delete buttons
        fetchActivities();
      }
    } catch (error) {
      alert("Logout error: " + error.message);
      console.error("Logout error:", error);
    }
  });

  // Allow Enter key in login form
  loginPasswordInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      loginBtn.click();
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons only if teacher is logged in
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(currentSessionId)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(currentSessionId)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  loginPrompt.classList.remove("hidden");
});
