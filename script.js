if (typeof Chart !== "undefined") {
  Chart.defaults.color = "#ffffff";
  Chart.defaults.plugins.legend.labels.color = "#ffffff";
  Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
  Chart.defaults.plugins.tooltip.bodyColor = "#ffffff";
  Chart.defaults.scale.ticks.color = "#ffffff";
}

class GitHubAnalytics {
  constructor() {
    this.apiBase = "https://api.github.com";
    this.currentUser = null;
    this.charts = {};
    this.languageColors = {
      JavaScript: "#f1e05a",
      Python: "#3572a5",
      Java: "#b07219",
      TypeScript: "#2b7489",
      HTML: "#e34c26",
      CSS: "#563d7c",
      PHP: "#4f5d95",
      C: "#555555",
      "C++": "#f34b7d",
      Go: "#00add8",
      Rust: "#dea584",
      Swift: "#ffac45",
      Kotlin: "#f18e33",
      Dart: "#00b4ab",
      Ruby: "#701516",
      Shell: "#89e051",
    };

    // Array of example usernames for suggestions
    this.rotatingUsernames = [
      "octocat",
      "torvalds",
      "gaearon",
      "sindresorhus",
      "tj",
      "addyosmani",
      "paulirish",
      "mikeal",
      "substack",
      "isaacs",
      "mrdoob",
      "jeresig",
      "defunkt",
      "mojombo",
      "wycats",
      "dhh",
      "tenderlove",
      "jashkenas",
      "fat",
      "mbostock",
      "holman",
      "kneath",
      "rtomayko",
      "technoweenie",
      "schacon",
      "pjhyett",
      "caged",
      "atmos",
      "bmizerany",
      "qrush",
    ];

    this.currentRotationIndex = 0;

    this.initializeEventListeners();
    this.startSuggestionRotation();
  }

  initializeEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const usernameInput = document.getElementById("usernameInput");
    const modeAnalyze = document.getElementById("modeAnalyze");
    const modeCompare = document.getElementById("modeCompare");
    const analyzeForm = document.getElementById("analyzeForm");
    const compareForm = document.getElementById("compareForm");
    const compareBtn = document.getElementById("compareBtn");
    const compareInputA = document.getElementById("compareInputA");
    const compareInputB = document.getElementById("compareInputB");

    searchBtn.addEventListener("click", () => this.searchUser());

    usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.searchUser();
      }
    });

    // Add some example usernames for demonstration
    usernameInput.addEventListener("focus", () => {
      if (!usernameInput.value) {
        usernameInput.placeholder = "Try: abhieshek11, upasana2503...";
      }
    });

    usernameInput.addEventListener("blur", () => {
      usernameInput.placeholder = "Enter GitHub username...";
    });

    // Mode toggle handlers
    const activateAnalyze = () => {
      modeAnalyze.classList.add("active");
      modeAnalyze.setAttribute("aria-selected", "true");
      modeCompare.classList.remove("active");
      modeCompare.setAttribute("aria-selected", "false");
      analyzeForm.classList.remove("hidden");
      compareForm.classList.add("hidden");
      this.hideCompareResults();
    };

    const activateCompare = () => {
      modeCompare.classList.add("active");
      modeCompare.setAttribute("aria-selected", "true");
      modeAnalyze.classList.remove("active");
      modeAnalyze.setAttribute("aria-selected", "false");
      compareForm.classList.remove("hidden");
      analyzeForm.classList.add("hidden");
      this.hideUserProfile();
    };

    modeAnalyze.addEventListener("click", activateAnalyze);
    modeCompare.addEventListener("click", activateCompare);

    compareBtn.addEventListener("click", () => this.compareUsers());
    [compareInputA, compareInputB].forEach((el) => {
      el.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.compareUsers();
      });
    });
  }

  async searchUser() {
    const username = document.getElementById("usernameInput").value.trim();

    if (!username) {
      this.showError("Please enter a GitHub username");
      return;
    }

    this.showLoading();
    this.hideError();
    this.hideUserProfile();

    try {
      const userData = await this.fetchUserData(username);
      const reposData = await this.fetchUserRepos(username);

      this.currentUser = userData;
      this.displayUserProfile(userData, reposData);
      this.createCharts(reposData);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async compareUsers() {
    const a = document.getElementById("compareInputA").value.trim();
    const b = document.getElementById("compareInputB").value.trim();

    if (!a || !b) {
      this.showError("Please enter two GitHub usernames to compare");
      return;
    }

    this.showLoading();
    this.hideError();
    this.hideUserProfile();
    this.hideCompareResults();

    try {
      // Fetch both users and repos in parallel
      const [userA, userB, reposA, reposB] = await Promise.all([
        this.fetchUserData(a),
        this.fetchUserData(b),
        this.fetchUserRepos(a),
        this.fetchUserRepos(b),
      ]);

      this.displayCompare(userA, reposA, userB, reposB);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async fetchUserData(username) {
    const response = await fetch(`${this.apiBase}/users/${username}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "User not found. Please check the username and try again."
        );
      } else if (response.status === 403) {
        throw new Error("API rate limit exceeded. Please try again later.");
      } else {
        throw new Error("Failed to fetch user data. Please try again.");
      }
    }

    return await response.json();
  }

  async fetchUserRepos(username) {
    const response = await fetch(
      `${this.apiBase}/users/${username}/repos?sort=stars&per_page=100`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch repositories data");
    }

    return await response.json();
  }

  displayUserProfile(userData, reposData) {
    // Calculate total stars
    const totalStars = reposData.reduce(
      (sum, repo) => sum + repo.stargazers_count,
      0
    );

    // Update profile information
    document.getElementById("userAvatar").src = userData.avatar_url;
    document.getElementById("userName").textContent =
      userData.name || userData.login;
    document.getElementById("userBio").textContent =
      userData.bio || "No bio available";

    // Update stats with animation
    this.animateCounter("publicRepos", userData.public_repos);
    this.animateCounter("followers", userData.followers);
    this.animateCounter("following", userData.following);
    this.animateCounter("totalStars", totalStars);

    // Display repositories
    this.displayRepositories(reposData.slice(0, 12)); // Show top 12 repos

    this.showUserProfile();
  }

  displayCompare(userA, reposA, userB, reposB) {
    // Calculate total stars for each
    const starsA = reposA.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const starsB = reposB.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    // Left card
    document.getElementById("compareAvatarA").src = userA.avatar_url;
    document.getElementById("compareNameA").textContent =
      userA.name || userA.login;
    document.getElementById("compareBioA").textContent =
      userA.bio || "No bio available";
    document.getElementById("compareLinkA").href = userA.html_url;
    this.setNumber("reposA", userA.public_repos);
    this.setNumber("followersA", userA.followers);
    this.setNumber("followingA", userA.following);
    this.setNumber("starsA", starsA);

    // Right card
    document.getElementById("compareAvatarB").src = userB.avatar_url;
    document.getElementById("compareNameB").textContent =
      userB.name || userB.login;
    document.getElementById("compareBioB").textContent =
      userB.bio || "No bio available";
    document.getElementById("compareLinkB").href = userB.html_url;
    this.setNumber("reposB", userB.public_repos);
    this.setNumber("followersB", userB.followers);
    this.setNumber("followingB", userB.following);
    this.setNumber("starsB", starsB);

    // Create charts for each side
    this.createLanguageChartFor("languageChartA", reposA, "languageA");
    this.createStarsChartFor("starsChartA", reposA, "starsA");
    this.createLanguageChartFor("languageChartB", reposB, "languageB");
    this.createStarsChartFor("starsChartB", reposB, "starsB");

    // Build summary insight
    this.renderComparisonSummary(
      { userA, reposA, starsA },
      { userB, reposB, starsB }
    );

    this.showCompareResults();
  }

  renderComparisonSummary(a, b) {
    const el = document.getElementById("compareSummary");
    if (!el) return;

    // Metrics
    const metrics = [
      {
        key: "followers",
        label: "Followers",
        a: a.userA.followers,
        b: b.userB.followers,
        weight: 3,
      },
      {
        key: "stars",
        label: "Total Stars",
        a: a.starsA,
        b: b.starsB,
        weight: 3,
      },
      {
        key: "public_repos",
        label: "Public Repos",
        a: a.userA.public_repos,
        b: b.userB.public_repos,
        weight: 2,
      },
      {
        key: "following",
        label: "Following",
        a: a.userA.following,
        b: b.userB.following,
        weight: 1,
      },
      {
        key: "language_diversity",
        label: "Language Diversity",
        a: new Set(a.reposA.map((r) => r.language).filter(Boolean)).size,
        b: new Set(b.reposB.map((r) => r.language).filter(Boolean)).size,
        weight: 1,
      },
    ];

    // Score
    let scoreA = 0;
    let scoreB = 0;
    const lines = [];
    metrics.forEach((m) => {
      if ((m.a || 0) > (m.b || 0)) {
        scoreA += m.weight;
        lines.push(
          `✅ ${this.safeName(a.userA)} leads in ${
            m.label
          } (${m.a.toLocaleString()} vs ${m.b.toLocaleString()}).`
        );
      } else if ((m.b || 0) > (m.a || 0)) {
        scoreB += m.weight;
        lines.push(
          `✅ ${this.safeName(b.userB)} leads in ${
            m.label
          } (${m.b.toLocaleString()} vs ${m.a.toLocaleString()}).`
        );
      } else {
        lines.push(
          `➖ Tie in ${m.label} (${(m.a || 0).toLocaleString()} vs ${(
            m.b || 0
          ).toLocaleString()}).`
        );
      }
    });

    const winnerText =
      scoreA > scoreB
        ? `${this.safeName(a.userA)} leads`
        : scoreB > scoreA
        ? `${this.safeName(b.userB)} leads`
        : `It's a tie`;

    // Build metric bars percentages
    const metricCards = metrics
      .map((m) => {
        const aVal = m.a || 0;
        const bVal = m.b || 0;
        const total = aVal + bVal || 1;
        const aPct = Math.round((aVal / total) * 100);
        const bPct = 100 - aPct;
        const icon =
          m.key === "followers"
            ? '<i class="fas fa-users"></i>'
            : m.key === "stars"
            ? '<i class="fas fa-star"></i>'
            : m.key === "public_repos"
            ? '<i class="fas fa-code-branch"></i>'
            : m.key === "following"
            ? '<i class="fas fa-user-plus"></i>'
            : '<i class="fas fa-code"></i>';
        return `
          <div class=\"insight-card\">
            <div class=\"insight-title\">${icon}<span>${m.label}</span></div>
            <div class=\"metric-row\">
              <span class=\"metric-badge\"><span class=\"legend-dot dot-a\"></span>${this.safeName(
                a.userA
              )}</span>
              <span>${aVal.toLocaleString()}</span>
            </div>
            <div class=\"bar\" aria-hidden=\"true\">
              <div class=\"bar-fill-a\" style=\"width:${aPct}%\"></div>
              <div class=\"bar-fill-b\" style=\"width:${bPct}%\"></div>
            </div>
            <div class=\"metric-footer\">
              <span class=\"metric-badge\"><span class=\"legend-dot dot-b\"></span>${this.safeName(
                b.userB
              )}</span>
              <span>${bVal.toLocaleString()}</span>
            </div>
          </div>
        `;
      })
      .join("");

    el.innerHTML = `
      <div class=\"summary-header\">
        <div class=\"repo-name\">Who’s ahead and why</div>
        <div class=\"winner-pill\">${winnerText} (${scoreA} - ${scoreB})</div>
      </div>
      <div class=\"legend-row\">
        <span class=\"legend-item\"><span class=\"legend-dot dot-a\"></span>${this.safeName(
          a.userA
        )}</span>
        <span class=\"legend-item\"><span class=\"legend-dot dot-b\"></span>${this.safeName(
          b.userB
        )}</span>
      </div>
      <div class=\"insight-grid\">${metricCards}</div>
    `;
  }

  safeName(user) {
    return user.name || user.login;
  }

  setNumber(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = Number(value || 0).toLocaleString();
  }

  createLanguageChartFor(canvasId, reposData, key) {
    const languageStats = {};
    reposData.forEach((repo) => {
      if (repo.language)
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
    });
    const sorted = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    const labels = sorted.map(([lang]) => lang);
    const data = sorted.map(([, count]) => count);
    const colors = labels.map((lang) => this.languageColors[lang] || "#ccc");

    if (this.charts[key]) this.charts[key].destroy();
    const ctx = document.getElementById(canvasId).getContext("2d");
    this.charts[key] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: "#0b0b0b",
            borderWidth: 4,
            hoverOffset: 12,
            hoverBorderWidth: 6,
            hoverBorderColor: "#00d4ff",
            hoverBackgroundColor: colors.map((c) =>
              this.adjustBrightness(c, 20)
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  createStarsChartFor(canvasId, reposData, key) {
    const topRepos = reposData
      .filter((repo) => repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);
    const labels = topRepos.map((repo) =>
      repo.name.length > 15 ? repo.name.substring(0, 15) + "..." : repo.name
    );
    const data = topRepos.map((repo) => repo.stargazers_count);

    if (this.charts[key]) this.charts[key].destroy();
    const ctx = document.getElementById(canvasId).getContext("2d");
    this.charts[key] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Stars",
            data,
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "#0b0b0b",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  displayRepositories(repos) {
    const container = document.getElementById("repositoriesList");
    container.innerHTML = "";

    repos.forEach((repo, index) => {
      const repoElement = document.createElement("div");
      repoElement.className = "repo-item fade-in";
      repoElement.style.animationDelay = `${index * 0.1}s`;

      const languageColor = this.languageColors[repo.language] || "#ccc";

      repoElement.innerHTML = `
                <div class="repo-name">${repo.name}</div>
                <div class="repo-description">${
                  repo.description || "No description available"
                }</div>
                <div class="repo-stats">
                    ${
                      repo.language
                        ? `
                        <div class="repo-stat">
                            <span class="language-dot" style="background-color: ${languageColor}"></span>
                            ${repo.language}
                        </div>
                    `
                        : ""
                    }
                    <div class="repo-stat">
                        <i class="fas fa-star text-warning"></i>
                        ${repo.stargazers_count}
                    </div>
                    <div class="repo-stat">
                        <i class="fas fa-code-branch text-info"></i>
                        ${repo.forks_count}
                    </div>
                    <div class="repo-stat">
                        <i class="fas fa-eye text-secondary"></i>
                        ${repo.watchers_count}
                    </div>
                </div>
            `;

      repoElement.addEventListener("click", () => {
        window.open(repo.html_url, "_blank");
      });

      container.appendChild(repoElement);
    });
  }

  createCharts(reposData) {
    this.createLanguageChart(reposData);
    this.createStarsChart(reposData);
  }

  createLanguageChart(reposData) {
    const languageStats = {};

    reposData.forEach((repo) => {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
      }
    });

    const sortedLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8); // Top 8 languages

    const labels = sortedLanguages.map(([lang]) => lang);
    const data = sortedLanguages.map(([, count]) => count);
    const colors = labels.map((lang) => this.languageColors[lang] || "#ccc");

    if (this.charts.language) {
      this.charts.language.destroy();
    }

    const ctx = document.getElementById("languageChart").getContext("2d");
    this.charts.language = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: "#1a1a2e",
            borderWidth: 4,
            hoverOffset: 12,
            hoverBorderWidth: 6,
            hoverBorderColor: "#00d4ff",
            hoverBackgroundColor: colors.map((color) =>
              this.adjustBrightness(color, 20)
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: window.innerWidth < 768 ? 10 : 20,
              usePointStyle: true,
              pointStyle: "circle",
              font: {
                size:
                  window.innerWidth < 480
                    ? 11
                    : window.innerWidth < 768
                    ? 12
                    : 13,
                family: "Space Grotesk",
                weight: "500",
              },
              color: "#ffffff",
              boxWidth: window.innerWidth < 480 ? 12 : 15,
              boxHeight: window.innerWidth < 480 ? 12 : 15,
              generateLabels: function (chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    const total = dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);

                    return {
                      text: `${label} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      fontColor: "#ffffff",
                      color: "#ffffff",
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "#00d4ff",
            borderWidth: 2,
            cornerRadius: 10,
            displayColors: true,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} repos (${percentage}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1200,
          easing: "easeOutCubic",
        },
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        onHover: (event, activeElements, chart) => {
          const canvas = chart.canvas;
          canvas.style.cursor =
            activeElements.length > 0 ? "pointer" : "default";
        },
      },
    });
  }

  adjustBrightness(color, amount) {
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (
      (usePound ? "#" : "") +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
    );
  }

  createStarsChart(reposData) {
    const topRepos = reposData
      .filter((repo) => repo.stargazers_count > 0)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);

    const labels = topRepos.map((repo) =>
      repo.name.length > 15 ? repo.name.substring(0, 15) + "..." : repo.name
    );
    const data = topRepos.map((repo) => repo.stargazers_count);

    if (this.charts.stars) {
      this.charts.stars.destroy();
    }

    const ctx = document.getElementById("starsChart").getContext("2d");
    this.charts.stars = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Stars",
            data: data,
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              font: {
                family: "Inter",
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: "Inter",
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: "easeOutQuart",
        },
      },
    });
  }

  animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(
        startValue + (targetValue - startValue) * easeOutQuart
      );

      element.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  showLoading() {
    document.getElementById("loadingSpinner").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingSpinner").classList.add("hidden");
  }

  showError(message) {
    document.getElementById("errorText").textContent = message;
    document.getElementById("errorMessage").classList.remove("hidden");
  }

  hideError() {
    document.getElementById("errorMessage").classList.add("hidden");
  }

  showUserProfile() {
    document.getElementById("userProfile").classList.remove("hidden");
    // Add profile link
    const profileLink = document.getElementById("profileLink");
    if (this.currentUser) {
      profileLink.href = this.currentUser.html_url;
    }
  }

  hideUserProfile() {
    document.getElementById("userProfile").classList.add("hidden");
  }

  showCompareResults() {
    document.getElementById("compareResults").classList.remove("hidden");
  }

  hideCompareResults() {
    document.getElementById("compareResults").classList.add("hidden");
  }

  // Helper function to adjust color brightness
  adjustBrightness(color, amount) {
    const usePound = color[0] === "#";
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (
      (usePound ? "#" : "") +
      ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
    );
  }
}

document.addEventListener("mousemove", (e) => {
  const cards = document.querySelectorAll(
    ".profile-card, .chart-card, .repos-card"
  );

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    } else {
      card.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  new GitHubAnalytics();
});

(() => {
  const root = document.documentElement;
  let targetX = 0.5;
  let targetY = 0.5;
  let currentX = 0.5;
  let currentY = 0.5;
  const lerp = (a, b, t) => a + (b - a) * t;
  const canvas = document.getElementById("bgCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const particles = [];
  const particleCount = 120;
  const resize = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  if (canvas) {
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      });
    }
  }
  const update = () => {
    currentX = lerp(currentX, targetX, 0.12);
    currentY = lerp(currentY, targetY, 0.12);
    root.style.setProperty("--mx", `${currentX * 100}%`);
    root.style.setProperty("--my", `${currentY * 100}%`);
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 200, 255, 0.7)";
      const mx = currentX * canvas.width;
      const my = currentY * canvas.height;
      const now = performance.now() * 0.001;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.hx === undefined) {
          p.hx = p.x;
          p.hy = p.y;
        }
        const wanderX = Math.sin(p.hx * 0.002 + now) * 0.2;
        const wanderY = Math.cos(p.hy * 0.002 + now) * 0.2;
        const toHomeX = (p.hx - p.x) * 0.01;
        const toHomeY = (p.hy - p.y) * 0.01;
        const dxm = mx - p.x;
        const dym = my - p.y;
        const dm = Math.hypot(dxm, dym);
        let repelX = 0;
        let repelY = 0;
        if (dm < 240) {
          const push = ((240 - dm) / 240) * 0.8;
          repelX = -dxm * push * 0.01;
          repelY = -dym * push * 0.01;
        }
        p.x += p.vx + wanderX + toHomeX + repelX;
        p.y += p.vy + wanderY + toHomeY + repelY;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(124, 58, 237, 0.25)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.globalAlpha = 1 - dist / 120;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    requestAnimationFrame(update);
  };
  window.addEventListener("mousemove", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    targetX = x;
    targetY = y;
  });
  update();
})();
